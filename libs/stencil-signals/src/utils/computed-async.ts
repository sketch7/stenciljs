/**
 * @ssv/stencil-signals — utils/computed-async.ts
 *
 * `computedAsync(fn, options?)` / `computedAsync(host, fn)` is a derived signal whose value comes from an
 * async operation (Promise or async function). It re-runs whenever any signal
 * accessed inside `fn` changes, automatically cancelling the in-flight
 * operation via AbortSignal.
 *
 * The returned signal holds an `AsyncResult<T>` discriminated union:
 *
 *   { status: 'pending', value: T | undefined }
 *   { status: 'resolved', value: T }
 *   { status: 'error', error: unknown, value: T | undefined }
 *
 * `value` is always present so templates can safely render the last known
 * good value while a new fetch is in-flight.
 *
 * ## Basic usage — data fetching
 *
 * ```ts
 * const userId = signal(1);
 *
 * const user = computedAsync(async (signal) => {
 *   const res = await fetch(`/api/users/${userId.get()}`, { signal });
 *   return res.json();
 * });
 *
 * // In render():
 * render() {
 *   const { status, value, error } = user.get();
 *   if (status === 'pending') return <Spinner />;
 *   if (status === 'error')   return <Error message={error.message} />;
 *   return <UserCard user={value} />;
 * }
 * ```
 *
 * ## With initial value
 *
 * ```ts
 * const posts = computedAsync(
 *   async (signal) => fetchPosts(signal),
 *   { initialValue: [] },
 * );
 * // posts.get().value is [] before the first resolve
 * ```
 *
 * ## Returning a plain value (sync fallback)
 *
 * The callback may also return a plain value synchronously — useful for
 * conditional branching where you sometimes have the answer immediately.
 *
 * ```ts
 * const result = computedAsync(() => {
 *   if (cache.has(id.get())) return cache.get(id.get());
 *   return fetch(`/api/${id.get()}`).then(r => r.json());
 * });
 * ```
 *
 * ## Options
 *
 * | Option | Type | Default | Description |
 * |---|---|---|---|
 * | `initialValue` | `T` | `undefined` | Value before first resolution |
 * | `equal` | `(a,b) => boolean` | `Object.is` | Skip update if resolved value is the same |
 */

import type { ReactiveControllerHost } from "@ssv/stencil.core";

import { getAdapter } from "../adapters/active";
import type { Signal } from "../adapters/types";
import { scheduler, getActiveOwner } from "../signals/core";

// ─── Public types ─────────────────────────────────────────────────────────────

export type AsyncStatus = "pending" | "resolved" | "error";

export type AsyncPending<T> = {
	status: "pending";
	/** Last resolved value, or `initialValue` if never resolved. */
	value: T | undefined;
	error?: undefined;
};

export type AsyncResolved<T> = {
	status: "resolved";
	value: T;
	error?: undefined;
};

export type AsyncError<T> = {
	status: "error";
	error: unknown;
	/** Last resolved value so templates can show stale data. */
	value: T | undefined;
};

export type AsyncResult<T> = AsyncPending<T> | AsyncResolved<T> | AsyncError<T>;

export type ComputedAsyncOptions<T> = {
	/** Value of `result.value` while the first fetch is pending. Default: `undefined`. */
	initialValue?: T;
	/** Custom equality for resolved values. If equal, the result signal is not updated. */
	equal?: (a: T, b: T) => boolean;
};

/**
 * A `SignalComputed` that owns an internal watcher and can be manually stopped.
 */
export type DisposableSignal<T> = {
	/** Stop all internal watchers and cancel any in-flight async operations. */
	dispose(): void;
} & Signal<T>;

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Create a signal whose value is derived from an async computation.
 * The computation re-runs whenever any signal accessed inside `fn` changes.
 * In-flight requests are cancelled via AbortSignal.
 *
 * Pass the component instance as `host` as the **first** argument to enable
 * automatic dispose-on-disconnect / reinit-on-reconnect lifecycle management.
 */
export function computedAsync<T>(
	host: ReactiveControllerHost,
	fn: (abortSignal: AbortSignal) => Promise<T> | T,
): DisposableSignal<AsyncResult<T>>;
export function computedAsync<T>(
	fn: (abortSignal: AbortSignal) => Promise<T> | T,
	options?: ComputedAsyncOptions<T>,
): DisposableSignal<AsyncResult<T>>;
export function computedAsync<T>(
	hostOrFn: ReactiveControllerHost | ((abortSignal: AbortSignal) => Promise<T> | T),
	fnOrOptions?: ((abortSignal: AbortSignal) => Promise<T> | T) | ComputedAsyncOptions<T>,
): DisposableSignal<AsyncResult<T>> {
	// ReactiveControllerHost: computedAsync(host, fn)
	if (typeof (hostOrFn as ReactiveControllerHost).addController === "function") {
		return _computedAsyncWithControllerHost(
			fnOrOptions as (abortSignal: AbortSignal) => Promise<T> | T,
			hostOrFn as ReactiveControllerHost,
		);
	}
	// Standard overload: computedAsync(fn, options?)
	const options = (fnOrOptions as ComputedAsyncOptions<T>) ?? {};
	const fn = hostOrFn as (abortSignal: AbortSignal) => Promise<T> | T;
	const owner = getActiveOwner();
	if (owner) {
		const sig = _computedAsyncCore(fn, options);
		owner.push(sig.dispose.bind(sig));
		return sig;
	}
	return _computedAsyncCore(fn, options);
}

// ─── ReactiveControllerHost path ──────────────────────────────────────────────

function _computedAsyncWithControllerHost<T>(
	fn: (abortSignal: AbortSignal) => Promise<T> | T,
	host: ReactiveControllerHost,
): DisposableSignal<AsyncResult<T>> {
	let inner: DisposableSignal<AsyncResult<T>> | null = null;
	let lastResult: AsyncResult<T> = { status: "pending", value: undefined };
	let manuallyDisposed = false;

	// Stable wrapper — the class property reference never changes.
	// Falls back to `lastResult` (last snapshot before disconnect) when inner is null.
	const wrapper = Object.assign((): AsyncResult<T> => inner?.() ?? lastResult, {
		peek(): AsyncResult<T> {
			return inner?.peek() ?? lastResult;
		},
		dispose(): void {
			if (manuallyDisposed) {
				return;
			}
			manuallyDisposed = true;
			lastResult = inner?.peek() ?? lastResult;
			inner?.dispose();
			inner = null;
		},
	}) as DisposableSignal<AsyncResult<T>>;

	host.addController({
		hostConnected(): void {
			if (manuallyDisposed || inner !== null) {
				return;
			}
			inner = _computedAsyncCore<T>(fn, { initialValue: lastResult.value });
		},
		hostDisconnected(): void {
			lastResult = inner?.peek() ?? lastResult;
			inner?.dispose();
			inner = null;
		},
	});

	return wrapper;
}

// ─── Core factory (no host) ───────────────────────────────────────────────────

function _computedAsyncCore<T>(
	fn: (abortSignal: AbortSignal) => Promise<T> | T,
	options: ComputedAsyncOptions<T> = {},
): DisposableSignal<AsyncResult<T>> {
	const { initialValue, equal = Object.is } = options;
	const adapter = getAdapter();

	// Internal state signal — holds the current AsyncResult.
	const result = adapter.createState<AsyncResult<T>>({
		status: "pending",
		value: initialValue,
	});

	// Track the currently active abort controller so we can cancel stale requests.
	let currentController: AbortController | null = null;
	// Track last resolved value for stale-while-revalidate behaviour.
	let lastResolved: T | undefined = initialValue;
	let disposed = false;

	// A computed that tracks signal deps inside `fn`. We never expose this
	// directly — it's only used to collect dependencies.
	//
	// Returns a new `{}` object on every evaluation so that Preact's equality
	// check (`Object.is`) always sees a "changed" value and propagates to the
	// watcher effect. TC39's Watcher fires on staleness (before equality checks),
	// so the unique-reference trick is harmless there too.
	const depTracker = adapter.createComputed<object>(() => {
		// Calling fn inside a computed records all signal.get() calls as deps.
		// We discard the return value here; actual execution happens in `run()`.
		try {
			// Abort the controller BEFORE calling fn so that fetch() receives an
			// already-aborted signal and rejects immediately without making a real
			// network request. Signal reads (e.g. userId.get()) still happen
			// synchronously before fetch() and are tracked as normal.
			const dummy = new AbortController();
			dummy.abort();
			const maybePromise = fn(dummy.signal);
			// Suppress unhandled rejection from the aborted dummy.
			if (maybePromise instanceof Promise) {
				maybePromise.catch(() => {
					// Swallow unhandled rejection — dummy was already aborted.
				});
			}
		} catch {
			// Ignore errors during dep-tracking pass.
		}
		// New object reference each call — forces Preact to propagate the change.
		return {};
	});

	// Do NOT call watcher.watch() inside notify — in TC39 that throws during
	// inNotificationPhase. Re-arm is done inside the scheduled task instead.
	const watcher = adapter.createWatcher(() => {
		if (disposed) {
			return;
		}
		scheduler.schedule(() => {
			if (disposed) {
				return;
			}
			// Re-arm: unwatch → re-evaluate depTracker (fresh dep tracking) → re-watch.
			watcher.unwatch(depTracker);
			depTracker();
			watcher.watch(depTracker);
			run();
		});
	});

	async function run() {
		if (disposed) {
			return;
		}

		// Cancel any in-flight request.
		currentController?.abort();
		const controller = new AbortController();
		currentController = controller;

		// Mark as pending, keeping the last resolved value.
		adapter.untrack(() => result.set({ status: "pending", value: lastResolved }));

		try {
			const value = await fn(controller.signal);

			// If aborted while awaiting, ignore the result.
			if (controller.signal.aborted || disposed) {
				return;
			}

			// Skip update if the resolved value is unchanged.
			const cur = result.peek();
			if (cur.status === "resolved" && equal(cur.value as T, value)) {
				return;
			}

			lastResolved = value;
			adapter.untrack(() => result.set({ status: "resolved", value }));
		} catch (error) {
			if (controller.signal.aborted || disposed) {
				return;
			}
			adapter.untrack(() => result.set({ status: "error", error, value: lastResolved }));
		}
	}

	// Arm watcher — initial dep collection.
	depTracker();
	watcher.watch(depTracker);

	// Kick off the first run.
	run();

	// Return a computed that reads the internal result state.
	// We also attach a `dispose` method so long-lived uses can clean up.
	const output = Object.assign(
		adapter.createComputed<AsyncResult<T>>(() => result()),
		{
			dispose(): void {
				disposed = true;
				currentController?.abort();
				watcher.dispose();
			},
		},
	) as unknown as DisposableSignal<AsyncResult<T>>;

	// Auto-register with the active owner scope so this computedAsync is
	// automatically disposed when the component disconnects from the DOM.
	getActiveOwner()?.push(output.dispose.bind(output));

	return output;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type-guard: result is pending. */
export function isPending<T>(r: AsyncResult<T>): r is AsyncPending<T> {
	return r.status === "pending";
}

/** Type-guard: result is resolved. */
export function isResolved<T>(r: AsyncResult<T>): r is AsyncResolved<T> {
	return r.status === "resolved";
}

/** Type-guard: result has errored. */
export function isError<T>(r: AsyncResult<T>): r is AsyncError<T> {
	return r.status === "error";
}
