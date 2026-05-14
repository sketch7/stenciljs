/**
 * @ssv/stencil-signals — extensions/effect.ts
 *
 * ─── Standalone (framework-agnostic) ─────────────────────────────────────────
 *
 *   effect(fn)
 *
 * Runs immediately, auto-tracks every signal read inside `fn`, and re-runs
 * whenever any of those signals change. Returns a dispose function.
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
 * Same signatures, but wraps the effect in the host's lifecycle. The effect
 * starts on `hostConnected` and is disposed on `hostDisconnected`. Must be
 * called in a component class-field initializer (where `use()` resolves the
 * host automatically).
 *
 * In both modes `fn` may return a cleanup function called before each re-run
 * and on final disposal.
 */

import { use } from "@ssv/stencil.core";

import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
import { scheduler } from "../signals/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CleanupFn = () => void;

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

// ─── effect overloads ─────────────────────────────────────────────────────────

/** Auto-tracking: re-runs whenever any signal read inside `fn` changes. Returns a dispose function. */
export function effect(fn: () => CleanupFn | void): CleanupFn;

/** Explicit-deps: re-runs only when signals in `deps` change. Returns a dispose function. */
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): CleanupFn;

// ─── effect implementation ────────────────────────────────────────────────────

export function effect(
	fnOrDeps: (() => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): CleanupFn {
	if (typeof fnOrDeps === "function") {
		return autoTrackingEffect(fnOrDeps);
	}

	if (!fn) {
		return () => {};
	}
	return explicitDepsEffect(fnOrDeps as readonly AnySignal[], fn, options ?? {});
}

// ─── useSignalEffect overloads ────────────────────────────────────────────────

/**
 * Auto-tracking lifecycle effect. Starts on `hostConnected`, disposes on `hostDisconnected`.
 *
 * @example
 * ```ts
 * readonly _eff = useSignalEffect(() => {
 *   document.title = `Count: ${count()}`;
 * });
 * ```
 */
export function useSignalEffect(fn: () => CleanupFn | void): void;

/**
 * Explicit-deps lifecycle effect. Starts on `hostConnected`, disposes on `hostDisconnected`.
 *
 * @example
 * ```ts
 * readonly _eff = useSignalEffect([userId], ([id]) => {
 *   fetchUser(id);
 * }, { defer: true });
 * ```
 */
export function useSignalEffect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): void;

// ─── useSignalEffect implementation ──────────────────────────────────────────

export function useSignalEffect(
	fnOrDeps: (() => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: (fn: CleanupFn) => void) => CleanupFn | void,
	options?: EffectOptions,
): void {
	let stop: CleanupFn | null = null;
	use({
		hostConnected(): void {
			if (stop !== null) {
				return;
			}
			stop =
				typeof fnOrDeps === "function"
					? effect(fnOrDeps)
					: fn
						? effect(fnOrDeps as readonly AnySignal[], fn, options)
						: () => {};
		},
		hostDisconnected(): void {
			stop?.();
			stop = null;
		},
	});
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
	let userCleanup: CleanupFn | undefined = undefined;
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
		}) as CleanupFn | undefined;
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
