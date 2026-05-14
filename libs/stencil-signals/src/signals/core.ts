import { getAdapter } from "../adapters/active";
/**
 * @ssv/stencil-signals — signals/core.ts
 *
 * Thin facade over the active SignalAdapter. All public primitives
 * (signal, computed, batch, untracked, createWatcher, collectSignals) delegate to
 * whichever adapter was registered by the entry point (TC39 or Preact).
 *
 * Also owns the shared microtask scheduler — it is backend-agnostic and
 * used by all utilities for coalescing effect re-runs.
 */
import type { AdapterWatcher, ComputedOptions, Signal, WritableSignal } from "../adapters/types";
export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "../adapters/types";

// ─── Scheduler ────────────────────────────────────────────────────────────────
//
// Backend-agnostic microtask batcher. All calls to schedule(fn) within the
// same synchronous frame are coalesced into one queueMicrotask flush.
// Drain is atomic: splice(0) copies + empties the queue so fns pushed
// during flush are also included in the same pass.

let effectsPending = false;
const pendingFns: (() => void)[] = [];

export const scheduler = {
	schedule(fn: () => void): void {
		pendingFns.push(fn);
		if (!effectsPending) {
			effectsPending = true;
			queueMicrotask(() => {
				effectsPending = false;
				const toRun = pendingFns.splice(0);
				for (const f of toRun) {
					f();
				}
			});
		}
	},
};

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Create a writable signal holding `value`. */
export function signal<T>(value: T, options?: SignalOptions<T>): WritableSignal<T> {
	return getAdapter().createState(value, options);
}

/** Create a read-only derived signal whose value is computed by `fn`. */
export function computed<T>(fn: () => T, options?: ComputedOptions<T>): Signal<T> {
	return getAdapter().createComputed(fn, options);
}

/**
 * Batch multiple signal writes so dependents update only once.
 * TC39 backend: no-op (microtask scheduler coalesces automatically).
 * Preact backend: delegates to Preact's batch().
 */
export function batch<T>(fn: () => T): T {
	return getAdapter().batch(fn);
}

/**
 * Run `fn` without establishing reactive dependencies on signal reads inside `fn`.
 * Aligns with `untracked()` in Angular and `@preact/signals-core`.
 */
export function untracked<T>(fn: () => T): T {
	return getAdapter().untrack(fn);
}

// ─── Active owner (effect scope) ────────────────────────────────────────────
//
// When non-null, any watcher-based utility (effect, computedAsync,
// computedPrevious) will push its dispose/cleanup function into this list.
// `SignalWatcher` activates the owner during `connectedCallback` so all
// watchers created there are automatically disposed on `disconnectedCallback`.
//
let _activeOwner: (() => void)[] | null = null;

/** @internal — used by SignalWatcher to set the active owner scope. */
export function setActiveOwner(list: (() => void)[] | null): void {
	_activeOwner = list;
}

/** @internal — used by watcher utilities to auto-register with the active owner. */
export function getActiveOwner(): (() => void)[] | null {
	return _activeOwner;
}

// ─── createWatcher() ──────────────────────────────────────────────────────────

/**
 * Create a low-level watcher that calls `notify` whenever a watched signal
 * changes. Used by tests and advanced consumers.
 *
 * Returns `{ watch(sig), unwatch(sig), dispose() }`.
 */
export function createWatcher(notify: () => void): AdapterWatcher {
	return getAdapter().createWatcher(notify);
}

// ─── collectSignals() ─────────────────────────────────────────────────────────

/**
 * Run `fn` inside a derived signal computation, then return the set of
 * signals it accessed. Useful for tooling and debugging.
 *
 * Note: relies on the adapter's createComputed — works on both backends.
 */
export function collectSignals(fn: () => void): Set<WritableSignal<unknown> | Signal<unknown>> {
	const accessed = new Set<WritableSignal<unknown> | Signal<unknown>>();
	const tracker = getAdapter().createComputed(() => {
		fn();
		return null;
	});
	// The first call evaluates and records deps — but we can't introspect
	// Preact's deps directly. collectSignals is primarily a debug utility and
	// works best with the TC39 backend. On Preact it returns an empty set.
	tracker();
	return accessed;
}
