/**
 * @ssv/stencil-signals — utils/effect.ts
 *
 * Two signatures, one function:
 *
 * ─── Auto-tracking ────────────────────────────────────────────────────────────
 *
 *   effect(fn)
 *
 * Runs `fn` immediately, tracks every signal `.get()` called inside it, and
 * re-runs `fn` whenever any of those signals change.
 *
 * ─── Explicit deps ────────────────────────────────────────────────────────────
 *
 *   effect(deps, fn, options?)
 *
 * Only re-runs when the signals listed in `deps` change. The callback receives
 * their current values as typed arguments. Signal reads *inside* `fn` that
 * are NOT in `deps` are untracked.
 *
 * Options:
 *   `defer: true` — skip the initial synchronous run; only fire on first change.
 *
 * In both modes `fn` may return a cleanup function called before each re-run
 * and on final disposal.
 */

import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
import type { WatcherRegistrar } from "../mixins/signal-watcher";
import { scheduler, getActiveOwner } from "../signals/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CleanupFn = () => void;

// TODO: Remove usage
type AnySignal<T = unknown> = WritableSignal<T> | Signal<T>;

type SignalValues<T extends readonly AnySignal[]> = {
	[K in keyof T]: T[K] extends AnySignal<infer V> ? V : never;
};

export type EffectOptions = {
	/**
	 * When `true`, the effect does NOT run immediately on creation.
	 * Only fires on first dep change. Applicable to explicit-deps mode only.
	 */
	defer?: boolean;
};

// ─── Overloads ────────────────────────────────────────────────────────────────

/** Auto-tracking: re-runs whenever any signal read inside `fn` changes. */
export function effect(fn: () => CleanupFn | void, host?: WatcherRegistrar): CleanupFn;

/** Explicit-deps: re-runs only when signals in `deps` change. */
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options: EffectOptions,
	host?: WatcherRegistrar,
): CleanupFn;
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	host?: WatcherRegistrar,
): CleanupFn;

// ─── Implementation ───────────────────────────────────────────────────────────

export function effect(
	fnOrDeps: (() => CleanupFn | void) | readonly AnySignal[],
	fnOrHost?: ((values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void) | WatcherRegistrar,
	optionsOrHost: EffectOptions | WatcherRegistrar = {},
	maybeHost?: WatcherRegistrar,
): CleanupFn {
	if (typeof fnOrDeps === "function") {
		// Auto-tracking overload: effect(fn, host?)
		const fn = fnOrDeps;
		const host =
			typeof (fnOrHost as WatcherRegistrar)?.__addWatcher === "function" ? (fnOrHost as WatcherRegistrar) : undefined;
		if (host) {
			return _effectWithHost(() => autoTrackingEffect(fn), host);
		}
		const stop = autoTrackingEffect(fn);
		getActiveOwner()?.push(stop);
		return stop;
	}

	// Explicit-deps overload: effect(deps, fn, options?, host?)
	const deps = fnOrDeps as readonly AnySignal[];
	const explicitFn = fnOrHost as (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void;

	let options: EffectOptions = {};
	let host: WatcherRegistrar | undefined;

	if (typeof (optionsOrHost as WatcherRegistrar)?.__addWatcher === "function") {
		host = optionsOrHost as WatcherRegistrar;
	} else {
		options = (optionsOrHost as EffectOptions) ?? {};
		host = maybeHost;
	}

	if (host) {
		return _effectWithHost(() => explicitDepsEffect(deps, explicitFn, options), host);
	}
	const stop = explicitDepsEffect(deps, explicitFn, options);
	getActiveOwner()?.push(stop);
	return stop;
}

// ─── Host path ────────────────────────────────────────────────────────────────

function _effectWithHost(factory: () => CleanupFn, host: WatcherRegistrar): CleanupFn {
	let stop = factory();
	let isDisposed = false;

	function dispose(): void {
		if (isDisposed) {
			return;
		}
		isDisposed = true;
		stop();
	}

	function reinit(): void {
		if (!isDisposed) {
			return;
		}
		stop = factory();
		isDisposed = false;
	}

	host.__addWatcher({ dispose, reinit });

	// Return the stable dispose — callers can also manually stop the effect.
	return dispose;
}

// ─── Auto-tracking implementation ─────────────────────────────────────────────
//
// Delegates to the adapter's createEffect() which handles dep tracking
// internally for both TC39 (Signal.Computed + Watcher) and Preact (effect()).

function autoTrackingEffect(fn: () => CleanupFn | void): CleanupFn {
	return getAdapter().createEffect(fn as () => (() => void) | undefined);
}

// ─── Explicit-deps implementation ─────────────────────────────────────────────

function explicitDepsEffect(
	deps: readonly AnySignal[],
	fn: (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options: EffectOptions,
): CleanupFn {
	let userCleanup: CleanupFn | undefined;
	let registeredCleanup: CleanupFn | undefined;
	let disposed = false;

	function onCleanup(cb: CleanupFn) {
		registeredCleanup = cb;
	}

	function readDeps(): unknown[] {
		// Read dep values without creating tracking subscriptions.
		return getAdapter().untrack(() => deps.map(d => d()));
	}

	function runCleanups() {
		if (typeof userCleanup === "function") {
			userCleanup();
			userCleanup = undefined;
		}
		if (typeof registeredCleanup === "function") {
			registeredCleanup();
			registeredCleanup = undefined;
		}
	}

	// Watcher is created before run() so the closure captures it.
	// Do NOT call watcher.watch() inside the notify callback.
	const watcher = getAdapter().createWatcher(() => {
		if (disposed) {
			return;
		}
		scheduler.schedule(run);
	});

	function run() {
		if (disposed) {
			return;
		}
		runCleanups();
		const values = readDeps();
		userCleanup = fn(values, onCleanup) as CleanupFn | undefined;
		// Re-arm all dep watchers — we are in a microtask, not in notify).
		// Unwatch first to avoid duplicate entries in TC39's liveConsumerNode array
		// (calling watch() multiple times on the same signal without unwatching grows
		// the array unboundedly, causing the memory leak).
		for (const dep of deps) {
			try {
				watcher.unwatch(dep);
				watcher.watch(dep);
			} catch {
				/* ok */
			}
		}
	}

	// Arm watcher on each dep.
	for (const dep of deps) {
		watcher.watch(dep);
	}

	// Initial run (unless deferred).
	if (!options.defer) {
		const values = readDeps();
		userCleanup = fn(values, onCleanup) as CleanupFn | undefined;
	}

	return () => {
		disposed = true;
		runCleanups();
		watcher.dispose();
	};
}
