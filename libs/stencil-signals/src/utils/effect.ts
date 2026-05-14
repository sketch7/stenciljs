/**
 * @ssv/stencil-signals — utils/effect.ts
 *
 * Two signatures, one function:
 *
 * ─── Auto-tracking ────────────────────────────────────────────────────────────
 *
 *   effect(fn)
 *   effect(host, fn)
 *
 * Runs `fn` immediately, tracks every signal `.get()` called inside it, and
 * re-runs `fn` whenever any of those signals change.
 *
 * ─── Explicit deps ────────────────────────────────────────────────────────────
 *
 *   effect(deps, fn, options?)
 *   effect(host, deps, fn, options?)
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
 *
 * Pass `host` (a `ReactiveControllerHost`) as the first argument to opt into
 * automatic lifecycle management: effect starts on `hostConnected`, disposes on
 * `hostDisconnected`, and restarts on the next `hostConnected`.
 */

import type { ReactiveControllerHost } from "@ssv/stencil.core";

import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
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
export function effect(fn: () => CleanupFn | void): CleanupFn;
export function effect(host: ReactiveControllerHost, fn: () => CleanupFn | void): CleanupFn;

/** Explicit-deps: re-runs only when signals in `deps` change. */
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): CleanupFn;
export function effect<const Deps extends readonly AnySignal[]>(
	host: ReactiveControllerHost,
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): CleanupFn;

// ─── Implementation ───────────────────────────────────────────────────────────

export function effect(
	hostOrFnOrDeps: ReactiveControllerHost | (() => CleanupFn | void) | readonly AnySignal[],
	fnOrDeps?:
		| (() => CleanupFn | void)
		| readonly AnySignal[]
		| ((values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void),
	fnOrOptions?: ((values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void) | EffectOptions,
	maybeOptions?: EffectOptions,
): CleanupFn {
	// ReactiveControllerHost: effect(host, fn) or effect(host, deps, fn, options?)
	if (typeof (hostOrFnOrDeps as ReactiveControllerHost)?.addController === "function") {
		const host = hostOrFnOrDeps as ReactiveControllerHost;
		if (typeof fnOrDeps === "function") {
			// effect(host, fn)
			return _effectWithControllerHost(() => autoTrackingEffect(fnOrDeps as () => CleanupFn | void), host);
		}
		// effect(host, deps, fn, options?)
		const deps = fnOrDeps as readonly AnySignal[];
		const explicitFn = fnOrOptions as (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void;
		const options = maybeOptions ?? {};
		return _effectWithControllerHost(() => explicitDepsEffect(deps, explicitFn, options), host);
	}

	if (typeof hostOrFnOrDeps === "function") {
		// Auto-tracking overload: effect(fn)
		const fn = hostOrFnOrDeps;
		const stop = autoTrackingEffect(fn);
		getActiveOwner()?.push(stop);
		return stop;
	}

	// Explicit-deps overload: effect(deps, fn, options?)
	const deps = hostOrFnOrDeps as readonly AnySignal[];
	const explicitFn = fnOrDeps as (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void;
	const options = (fnOrOptions as EffectOptions) ?? {};
	const stop = explicitDepsEffect(deps, explicitFn, options);
	getActiveOwner()?.push(stop);
	return stop;
}

// ─── ReactiveControllerHost path ──────────────────────────────────────────────
// Effect starts on first hostConnected; disposes on hostDisconnected; restarts on next hostConnected.

function _effectWithControllerHost(factory: () => CleanupFn, host: ReactiveControllerHost): CleanupFn {
	let stop: CleanupFn | null = null;
	let manuallyDisposed = false;

	host.addController({
		hostConnected(): void {
			if (manuallyDisposed || stop !== null) {
				return;
			}
			stop = factory();
		},
		hostDisconnected(): void {
			stop?.();
			stop = null;
		},
	});

	// Return a stable dispose for manual teardown.
	return () => {
		manuallyDisposed = true;
		stop?.();
		stop = null;
	};
}

// ─── Auto-tracking implementation ─────────────────────────────────────────────
//
// Delegates to the adapter's createEffect() which handles dep tracking
// internally for both TC39 (Signal.Computed + Watcher) and Preact (effect()).

function autoTrackingEffect(fn: () => CleanupFn | void): CleanupFn {
	return getAdapter().createEffect(fn);
}

// ─── Explicit-deps implementation ─────────────────────────────────────────────
//
// Uses a single depTracker computed to unify all listed deps into one Signal
// that the Watcher can watch — same pattern as _computedAsyncCore. Returns {}
// each evaluation so both TC39 (staleness-based) and Preact (equality-based)
// adapters always see the signal as changed.

function explicitDepsEffect(
	deps: readonly AnySignal[],
	fn: (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options: EffectOptions,
): CleanupFn {
	const adapter = getAdapter();
	let pendingCleanup: CleanupFn | null = null;
	let userCleanup: CleanupFn | void = undefined;
	let disposed = false;

	function runEffect(): void {
		pendingCleanup?.();
		pendingCleanup = null;
		if (typeof userCleanup === "function") {
			userCleanup();
			userCleanup = undefined;
		}

		const values = deps.map(s => adapter.untrack(() => s()));
		let onCleanupFn: CleanupFn | null = null;

		userCleanup = fn(values, cb => {
			onCleanupFn = cb;
		});
		if (onCleanupFn) {
			pendingCleanup = onCleanupFn;
		}
	}

	// A computed that reads all deps in one place. Never exposes a meaningful
	// value — returns a new object reference each time so Preact always
	// propagates the change to the watcher.
	const depTracker = adapter.createComputed<object>(() => {
		try {
			const dummy = Object.create(null);
			for (const dep of deps) {
				dep();
			}
			return dummy;
		} catch {
			return Object.create(null);
		}
	});

	const watcher = adapter.createWatcher(() => {
		if (disposed) {
			return;
		}
		scheduler.schedule(() => {
			if (disposed) {
				return;
			}
			watcher.unwatch(depTracker);
			depTracker();
			watcher.watch(depTracker);
			runEffect();
		});
	});

	// Initial arm: evaluate depTracker to collect deps, then watch it.
	depTracker();
	watcher.watch(depTracker);
	if (!options.defer) {
		runEffect();
	}

	return () => {
		disposed = true;
		watcher.dispose();
		pendingCleanup?.();
		if (typeof userCleanup === "function") {
			userCleanup();
		}
	};
}
