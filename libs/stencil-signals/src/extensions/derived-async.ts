/**
 * @ssv/stencil-signals — utils/derived-async.ts
 *
 * `derivedAsync(fn, options?)` is a derived signal whose value comes from a
 * promise (or synchronous `T`). It re-runs whenever any signal accessed inside
 * `fn` changes (via `adapter.createEffect`); prior in-flight work is cancelled
 * with `AbortSignal` (switch semantics).
 *
 * The returned **`DisposableSignal<T>`** reads **`undefined`** until the first
 * successful resolution when `initialValue` is omitted
 *
 * If the computation rejects or throws, **`get()`/`()`** **rethrows** that error.
 * **`peek()`** does not throw — in an error state it returns **`undefined`**
 * (used for host disconnect snapshots). Prefer **`catch`** inside the callback
 * or guard **`get()`/`()`** reads with try/catch in UI code.
 *
 * ## Basic usage — data fetching
 *
 * ```ts
 * const userId = signal(1);
 *
 * const user = derivedAsync(async (abortSignal, _previous) => {
 *   const res = await fetch(`/api/users/${userId.get()}`, { signal: abortSignal });
 *   return res.json();
 * });
 *
 * render() {
 *   const row = user();
 *   if (row === undefined) return <Spinner />;
 *   return <UserCard user={row} />;
 * }
 * ```
 *
 * ## With initial value
 *
 * ```ts
 * const posts = derivedAsync(
 *   async (signal) => fetchPosts(signal),
 *   { initialValue: [] },
 * );
 * // posts.get() is [] before the first resolve; last value while refetching
 * ```
 *
 * ## Options
 *
 * | Option | Type | Default | Description |
 * |---|---|---|---|
 * | `initialValue` | `T` | `undefined` | Value before first resolution / while refetching |
 * | `equal` | `(a,b) => boolean` | `Object.is` | Skip update if resolved value is unchanged |
 */

import { getAdapter } from "../adapters/active";
import type { Signal } from "../adapters/types";
import { getActiveOwner } from "../signals/core";
import type { WatcherRef } from "./effect";
import { bindToHostDisposable } from "./host-bind";

// ─── Public types ─────────────────────────────────────────────────────────────

export type DerivedAsyncOptions<T> = {
	/** Value before first resolution and while a new fetch is in flight. Default: `undefined`. */
	initialValue?: T;
	/** Custom equality for resolved values. If equal, the internal state is not updated. */
	equal?: (a: T, b: T) => boolean;
};

export type DerivedAsyncFn<T> = (abortSignal: AbortSignal, previousValue?: T | undefined) => Promise<T> | T;

/**
 * A read-only derived signal that owns an internal effect and can be stopped with `dispose()`.
 */
export type DisposableSignal<T> = WatcherRef & Signal<T>;

// ─── Internal state ───────────────────────────────────────────────────────────

type InternalState<T> = { kind: "value"; value: T | undefined } | { kind: "error"; error: unknown };

function isThenable(x: unknown): x is PromiseLike<unknown> {
	return x !== null && typeof x === "object" && typeof (x as PromiseLike<unknown>).then === "function";
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Create a signal whose value is derived from an async computation.
 * Standalone — runs immediately and returns a `DisposableSignal`. Call `.dispose()` manually.
 */
export function derivedAsync<T>(fn: DerivedAsyncFn<T>, options?: DerivedAsyncOptions<T>): DisposableSignal<T> {
	return _derivedAsyncCore(fn, options ?? {});
}

/**
 * Lifecycle-bound variant. Starts on `hostConnected`; disposal via
 * `useSignalWatcher()` active-owner scope. Must be called in a component
 * class-field initializer with `useSignalWatcher()` declared first.
 */
export function useDerivedAsync<T>(fn: DerivedAsyncFn<T>, options?: DerivedAsyncOptions<T>): DisposableSignal<T> {
	const opts = options ?? {};
	const initialSnapshot = opts.initialValue as T | undefined;
	return bindToHostDisposable({
		utilityName: "useDerivedAsync",
		initialSnapshot,
		create: snapshot =>
			_derivedAsyncCore<T>(fn, {
				...opts,
				initialValue: snapshot,
			}),
		read: inner => inner(),
		peek: inner => inner.peek(),
		disposeInner: inner => inner.dispose(),
	}) as DisposableSignal<T>;
}

function _derivedAsyncCore<T>(fn: DerivedAsyncFn<T>, options: DerivedAsyncOptions<T> = {}): DisposableSignal<T> {
	const { initialValue, equal = Object.is } = options;
	const adapter = getAdapter();

	const source = adapter.createState<InternalState<T>>({
		kind: "value",
		value: initialValue,
	});

	let disposed = false;

	const innerComputed = adapter.createComputed<T>(() => {
		const st = source();
		if (st.kind === "error") {
			throw st.error;
		}
		return st.value as T;
	});

	const effectRef = adapter.createEffect(onCleanup => {
		const previous = adapter.untrack((): T | undefined => {
			const st = source.peek();
			return st.kind === "value" ? (st.value as T | undefined) : undefined;
		});

		const controller = new AbortController();
		onCleanup(() => {
			controller.abort();
		});

		const settleValue = (value: T): void => {
			if (controller.signal.aborted || disposed) {
				return;
			}
			const cur = source.peek();
			if (cur.kind === "value" && equal(cur.value as T, value)) {
				return;
			}
			adapter.untrack(() => source.set({ kind: "value", value }));
		};

		const settleError = (error: unknown): void => {
			if (controller.signal.aborted || disposed) {
				return;
			}
			adapter.untrack(() => source.set({ kind: "error", error }));
		};

		try {
			const out = fn(controller.signal, previous);
			if (isThenable(out)) {
				Promise.resolve(out).then(
					value => {
						settleValue(value as T);
					},
					error => {
						settleError(error);
					},
				);
			} else {
				settleValue(out as T);
			}
		} catch (error) {
			settleError(error);
		}
	});

	const output = Object.assign((): T => innerComputed(), {
		get(): T {
			return innerComputed.get();
		},
		/** Does not throw on error state (returns `undefined`); safe for host snapshot on disconnect. */
		peek(): T {
			const st = adapter.untrack(() => source.peek());
			if (st.kind === "error") {
				return undefined as T;
			}
			return st.value as T;
		},
		dispose(): void {
			disposed = true;
			effectRef.dispose();
		},
	}) as unknown as DisposableSignal<T>;

	getActiveOwner()?.push(output.dispose.bind(output));

	return output;
}
