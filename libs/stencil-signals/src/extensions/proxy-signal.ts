/**
 * @ssv/stencil-signals — extensions/proxy-signal.ts
 *
 * A reusable signal wrapper that intercepts reads (`get`) and/or writes (`set`)
 * over a source signal, while preserving the full Signal / WritableSignal
 * interface. Useful on for projections, validation, or write interception.
 *
 * Unlike a JS `Proxy`, this uses the library's idiomatic callable wrapper
 * (`Object.assign`) — the signal surface (`get`, `peek`, `set`, `update`,
 * `asReadonly`) is small and fully known, so the wrapper is complete and faster.
 *
 * `proxySignal` owns no resources (no timers/listeners), so it requires no host
 * lifecycle and no `useSignalWatcher()`.
 */

import type { Signal, WritableSignal } from "../adapters/types";
import { untracked } from "../signals/core";

/** Custom read/write hooks for `proxySignal`. */
export type ProxySignalHandler<T, R = T> = {
	/** Project the source's value on read. Omit to pass the value through (then `R` is `T`). */
	get?: (source: Signal<T>) => R;
	/** Intercept writes. Receives the inner writable source and the incoming (projected) value. */
	set?: (source: WritableSignal<T>, value: R) => void;
};

/** Options for `proxySignal`. */
export type ProxySignalOptions<R> = {
	/** Equality used to skip no-op writes before invoking the `set` hook. Defaults to `Object.is`. */
	equal?: (a: R, b: R) => boolean;
};

// Writable source + get + set → writable, projected to R.
export function proxySignal<T, R>(
	source: WritableSignal<T>,
	handler: { get: (source: Signal<T>) => R; set: (source: WritableSignal<T>, value: R) => void },
	options?: ProxySignalOptions<R>,
): WritableSignal<R>;

// Writable source + set only → writable, same type T (reads pass through).
export function proxySignal<T>(
	source: WritableSignal<T>,
	handler: { set: (source: WritableSignal<T>, value: T) => void; get?: undefined },
	options?: ProxySignalOptions<T>,
): WritableSignal<T>;

// Any source + get only → read-only, projected to R.
export function proxySignal<T, R>(
	source: Signal<T>,
	handler: { get: (source: Signal<T>) => R; set?: undefined },
): Signal<R>;

export function proxySignal<T, R>(
	source: Signal<T> | WritableSignal<T>,
	handler: ProxySignalHandler<T, R>,
	options?: ProxySignalOptions<R>,
): Signal<R> | WritableSignal<R> {
	const equal = options?.equal ?? Object.is;
	const getHook = handler.get;

	const read = (): R => (getHook ? getHook(source) : (source() as unknown as R));
	const peek = (): R => (getHook ? untracked(() => getHook(source)) : (source.peek() as unknown as R));

	const wrapper = Object.assign(read, { get: read, peek }) as Signal<R>;

	const writable = source as WritableSignal<T>;
	const isWritable = typeof writable.set === "function";

	// Read-only result: source is not writable, or no `set` hook was provided.
	if (!isWritable || !handler.set) {
		return wrapper;
	}

	const setHook = handler.set;
	const setImpl = (value: R): void => {
		untracked(() => {
			if (equal(read(), value)) {
				return;
			}
			setHook(writable, value);
		});
	};

	let readonlyView: Signal<R> | undefined;

	return Object.assign(wrapper, {
		set: setImpl,
		update(fn: (current: R) => R): void {
			setImpl(fn(untracked(read)));
		},
		asReadonly(): Signal<R> {
			return (readonlyView ??= getHook
				? proxySignal(writable.asReadonly(), { get: getHook })
				: (writable.asReadonly() as unknown as Signal<R>));
		},
	}) as WritableSignal<R>;
}
