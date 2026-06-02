import { peekCurrentHost, use } from "@ssv/stencil-core";
import { Build } from "@stencil/core";

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

export type DerivedAsyncFn<T> = (abortSignal: AbortSignal, previousValue?: T) => Promise<T> | T;

/**
 * A read-only derived signal that owns an internal effect and can be stopped with `dispose()`.
 * `whenSettled` resolves after the first successful or failed async settlement.
 */
export type DisposableSignal<T> = WatcherRef &
	Signal<T> & {
		readonly whenSettled: Promise<void>;
	};

// ─── Internal state ───────────────────────────────────────────────────────────

type InternalState<T> = { kind: "value"; value: T | undefined } | { kind: "error"; error: unknown };

function isThenable(x: unknown): x is PromiseLike<unknown> {
	return x !== null && typeof x === "object" && typeof (x as PromiseLike<unknown>).then === "function";
}

// ─── Implementation ───────────────────────────────────────────────────────────

/** Derived signal whose value comes from an async computation; re-runs on tracked signal change with AbortSignal switch semantics. */
export function derivedAsync<T>(fn: DerivedAsyncFn<T>, options?: DerivedAsyncOptions<T>): DisposableSignal<T> {
	const opts = options ?? {};
	if (peekCurrentHost() !== null) {
		const initialSnapshot = opts.initialValue;
		let whenSettled: Promise<void> | undefined;

		const wrapper = bindToHostDisposable({
			utilityName: "derivedAsync",
			eager: true,
			initialSnapshot,
			create: snapshot => {
				const inner = _derivedAsyncCore<T>(fn, {
					...opts,
					initialValue: snapshot,
				});
				whenSettled = inner.whenSettled;
				return inner;
			},
			read: inner => inner(),
			peek: inner => inner.peek(),
			disposeInner: inner => inner.dispose(),
		});

		use({
			hostWillLoad(): Promise<void> | void {
				if (!Build.isServer || whenSettled === undefined) {
					return;
				}
				return whenSettled;
			},
		});

		return wrapper as DisposableSignal<T>;
	}
	return _derivedAsyncCore(fn, opts);
}

function _derivedAsyncCore<T>(fn: DerivedAsyncFn<T>, options: DerivedAsyncOptions<T> = {}): DisposableSignal<T> {
	const { initialValue, equal = Object.is } = options;
	const adapter = getAdapter();

	const source = adapter.createState<InternalState<T>>({
		kind: "value",
		value: initialValue,
	});

	let disposed = false;
	let hasSettled = false;
	let settleResolve!: () => void;
	const whenSettled = new Promise<void>(resolve => {
		settleResolve = resolve;
	});

	const markSettled = (): void => {
		if (!hasSettled) {
			hasSettled = true;
			settleResolve();
		}
	};

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
			return st.kind === "value" ? st.value : undefined;
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
			markSettled();
		};

		const settleError = (error: unknown): void => {
			if (controller.signal.aborted || disposed) {
				return;
			}
			adapter.untrack(() => source.set({ kind: "error", error }));
			markSettled();
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
				settleValue(out);
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
		whenSettled,
	}) as unknown as DisposableSignal<T>;

	getActiveOwner()?.push(output.dispose.bind(output));

	return output;
}
