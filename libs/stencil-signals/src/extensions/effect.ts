/**
 * @ssv/stencil-signals — extensions/effect.ts
 *
 * ─── Standalone (framework-agnostic) ─────────────────────────────────────────
 *
 *   effect(fn)
 *
 * Runs immediately, auto-tracks every signal read inside `fn`, and re-runs
 * whenever any of those signals change. Returns a `WatcherRef`.
 *
 *   effect(deps, fn, options?)
 *
 * Only re-runs when the signals in `deps` change. The callback receives their
 * current values as typed arguments. Signal reads inside `fn` that are NOT in
 * `deps` are untracked.
 *
 * Options:
 *   `defer: true` — skip the initial run; only fire on first dep change.
 *
 * ─── Lifecycle-bound (Stencil / ReactiveControllerHost) ──────────────────────
 *
 *   useSignalEffect(fn)
 *   useSignalEffect(deps, fn, options?)
 *
 * Same signatures, but binds the effect to the host lifecycle via
 * `bindToHostEffect`. Starts on `hostConnected`; disposal is handled by
 * `useSignalWatcher()` active-owner scope on disconnect. Must be called in
 * a component class-field initializer (where `use()` resolves the host).
 *
 * Both modes support `onCleanup(fn)` and an optional return-value cleanup.
 * On each re-run and on dispose: previous `onCleanup` runs first, then return cleanup.
 */

import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
import { getActiveOwner, scheduler } from "../signals/core";
import { bindToHostEffect } from "./host-bind";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WatcherRef = {
	dispose(): void;
};

export type CleanupFn = () => void;

export type RegisterCleanup = (fn: CleanupFn) => void;

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

type EffectCleanupState = {
	pendingCleanup: CleanupFn | null;
	userCleanup: CleanupFn | undefined;
};

// ─── Shared cleanup runner ────────────────────────────────────────────────────

function flushCleanups(state: EffectCleanupState): void {
	state.pendingCleanup?.();
	state.pendingCleanup = null;
	if (typeof state.userCleanup === "function") {
		state.userCleanup();
		state.userCleanup = undefined;
	}
}

function flushAllCleanups(state: EffectCleanupState): void {
	state.pendingCleanup?.();
	if (typeof state.userCleanup === "function") {
		state.userCleanup();
	}
}

/** @internal — runs user fn after flushing prior cleanups; captures onCleanup + return. */
export function runEffectWithCleanup(
	state: EffectCleanupState,
	fn: (onCleanup: RegisterCleanup) => CleanupFn | void,
): void {
	flushCleanups(state);
	let onCleanupFn: CleanupFn | null = null;
	state.userCleanup = fn(cb => {
		onCleanupFn = cb;
	}) as CleanupFn | undefined;
	if (onCleanupFn) {
		state.pendingCleanup = onCleanupFn;
	}
}

function toWatcherRef(dispose: CleanupFn): WatcherRef {
	return { dispose };
}

const noopWatcherRef: WatcherRef = {
	dispose: () => {
		/* no-op */
	},
};

// ─── effect overloads ─────────────────────────────────────────────────────────

/** Auto-tracking: re-runs whenever any signal read inside `fn` changes. */
export function effect(fn: (onCleanup: RegisterCleanup) => CleanupFn | void): WatcherRef;

/** Explicit-deps: re-runs only when signals in `deps` change. */
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef;

// ─── effect implementation ────────────────────────────────────────────────────

export function effect(
	fnOrDeps: ((onCleanup: RegisterCleanup) => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef {
	if (typeof fnOrDeps === "function") {
		return autoTrackingEffect(fnOrDeps);
	}

	if (!fn) {
		return noopWatcherRef;
	}
	return explicitDepsEffect(fnOrDeps as readonly AnySignal[], fn, options ?? {});
}

// ─── useSignalEffect overloads ────────────────────────────────────────────────

/**
 * Auto-tracking lifecycle effect. Starts on `hostConnected`, disposes on `hostDisconnected`.
 */
export function useSignalEffect(fn: (onCleanup: RegisterCleanup) => CleanupFn | void): WatcherRef;

/**
 * Explicit-deps lifecycle effect. Starts on `hostConnected`, disposes on `hostDisconnected`.
 */
export function useSignalEffect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef;

// ─── useSignalEffect implementation ──────────────────────────────────────────

export function useSignalEffect(
	fnOrDeps: ((onCleanup: RegisterCleanup) => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef {
	return bindToHostEffect({
		utilityName: "useSignalEffect",
		create: () =>
			typeof fnOrDeps === "function"
				? effect(fnOrDeps)
				: fn
					? effect(fnOrDeps as readonly AnySignal[], fn, options)
					: noopWatcherRef,
	});
}

// ─── Auto-tracking implementation ─────────────────────────────────────────────
//
// Delegates to the adapter's createEffect() which handles dep tracking
// internally for both TC39 (Signal.Computed + Watcher) and Preact (effect()).

function autoTrackingEffect(fn: (onCleanup: RegisterCleanup) => CleanupFn | void): WatcherRef {
	const ref = getAdapter().createEffect(fn);
	getActiveOwner()?.push(() => ref.dispose());
	return ref;
}

// ─── Explicit-deps implementation ─────────────────────────────────────────────
//
// Uses a single depTracker computed to unify all listed deps into one Signal
// that the Watcher can watch — same pattern as _computedAsyncCore. Returns {}
// each evaluation so both TC39 (staleness-based) and Preact (equality-based)
// adapters always see the signal as changed.

function explicitDepsEffect(
	deps: readonly AnySignal[],
	fn: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options: EffectOptions,
): WatcherRef {
	const adapter = getAdapter();
	const cleanupState: EffectCleanupState = { pendingCleanup: null, userCleanup: undefined };
	let disposed = false;

	function runEffect(): void {
		const values = deps.map(s => adapter.untrack(() => s()));
		runEffectWithCleanup(cleanupState, onCleanup => fn(values, onCleanup));
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

	const ref = toWatcherRef(() => {
		disposed = true;
		watcher.dispose();
		flushAllCleanups(cleanupState);
	});
	getActiveOwner()?.push(() => ref.dispose());
	return ref;
}
