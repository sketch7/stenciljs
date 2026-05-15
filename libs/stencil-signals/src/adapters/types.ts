/**
 * @ssv/stencil-signals — adapters/types.ts
 *
 * Shared adapter interface that both the TC39 and Preact backends implement.
 * All utilities depend on this interface — never on a specific signal library.
 */

// ─── Signal shapes ────────────────────────────────────────────────────────────

/** Read-only derived signal — common interface over TC39 Signal.Computed and Preact computed(). */
export type Signal<T> = {
	/** Read the computed value (tracked inside computeds / effects). */
	(): T;
	/** Read the computed value (tracked inside computeds / effects). Alias for calling the signal as a function. */
	get(): T;
	/** Read the computed value WITHOUT tracking. */
	peek(): T;
};

/** Writable signal — common interface over TC39 Signal.State and Preact signal(). */
export type WritableSignal<T> = {
	/** Write a new value. */
	set(value: T): void;
	/** Derive the next value from the current one. Uses an untracked read. */
	update(fn: (current: T) => T): void;
	/** Return a read-only view of this signal. */
	asReadonly(): Signal<T>;
} & Signal<T>;

/** Options accepted by signal() — both backends support at least `equals`. */
export type SignalOptions<T> = {
	/** Custom equality. When it returns true the signal is not considered changed. */
	equals?: (a: T, b: T) => boolean;
};

/** Options accepted by computed() — same shape as SignalOptions. */
export type ComputedOptions<T> = SignalOptions<T>;

// ─── Watcher ─────────────────────────────────────────────────────────────────

/**
 * Low-level watcher returned by `createWatcher()` and used internally by
 * effect, and explicit-deps `effect(deps, …)`.
 *
 * TC39 backend: wraps Signal.subtle.Watcher.
 * Preact backend: emulated via a combined computed() + effect().
 */
export type AdapterWatcher = {
	/** Start watching a signal for changes. Idempotent for already-watched signals. */
	watch(sig: WritableSignal<unknown> | Signal<unknown>): void;
	/** Stop watching a signal. No-op if not currently watched. */
	unwatch(sig: WritableSignal<unknown> | Signal<unknown>): void;
	/** Dispose the watcher and stop all watching. */
	dispose(): void;
};

// ─── Adapter interface ────────────────────────────────────────────────────────

export type SignalAdapter = {
	/** Create a writable signal holding an initial value. */
	createState<T>(value: T, options?: SignalOptions<T>): WritableSignal<T>;

	/** Create a read-only derived signal whose value is computed by `fn`. */
	createComputed<T>(fn: () => T, options?: ComputedOptions<T>): Signal<T>;

	/**
	 * Run `fn` as a reactive effect. `fn` is called immediately and re-runs
	 * whenever any signal accessed inside it changes.
	 * `fn` receives `onCleanup` and may return a cleanup function; on each re-run
	 * and dispose, prior `onCleanup` runs first, then return cleanup.
	 */
	createEffect(fn: (onCleanup: (fn: () => void) => void) => (() => void) | void): { dispose(): void };

	/** Read signals inside `fn` without creating tracking subscriptions. */
	untrack<T>(fn: () => T): T;

	/**
	 * Batch multiple signal writes so dependents only update once.
	 * TC39: no-op (microtask scheduler already coalesces updates).
	 * Preact: delegates to Preact's batch().
	 */
	batch<T>(fn: () => T): T;

	/** Create a low-level watcher that fires `notify` when a watched signal changes. */
	createWatcher(notify: () => void): AdapterWatcher;
};
