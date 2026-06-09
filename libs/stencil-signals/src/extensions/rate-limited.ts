/**
 * @ssv/stencil-signals — extensions/rate-limited.ts
 *
 * `throttled` and `debounced` — rate-limited signals built on `proxySignal`
 * and the timer wrappers in `@ssv/stencil-core`. Two shapes each:
 *
 *  - Source overload: wrap an existing signal → read-only signal that mirrors
 *    the source, rate-limited. Powered by an internal `effect`.
 *  - Value overload: pass an initial value → writable signal whose reads are
 *    immediate but whose `set()` / `update()` are rate-limited.
 *
 * Lifecycle: when used as a host class field the internal timer is cancelled on
 * `hostDisconnected`; the source overload's `effect` also requires
 * `useSignalWatcher()` to be declared first (same rule as `effect` /
 * `derivedAsync`). Standalone usage returns `dispose()` for manual teardown.
 */

import { peekCurrentHost, use, debounceCallback, throttleCallback } from "@ssv/stencil-core";
import type { Cancelable } from "@ssv/stencil-core";

import type { Signal, SignalOptions, WritableSignal } from "../adapters/types";
import { signal } from "../signals/core";
import { effect } from "./effect";
import type { WatcherRef } from "./effect";
import { proxySignal } from "./proxy-signal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RateLimitedOptions<T> = SignalOptions<T>;

/** Read-only rate-limited signal (source overload) with manual `dispose()`. */
export type RateLimitedSignal<T> = Signal<T> & WatcherRef;

/** Writable rate-limited signal (value overload) with manual `dispose()`. */
export type RateLimitedWritableSignal<T> = WritableSignal<T> & WatcherRef;

// ─── Guards ─────────────────────────────────────────────────────────────────

function isSignal<T>(value: unknown): value is Signal<T> {
	// Both writable and read-only signals are callable and expose `peek()`.
	// (Writables created by `signal()` omit a `get` method at runtime, so `peek` is the reliable marker.)
	return typeof value === "function" && typeof (value as Partial<Signal<T>>).peek === "function";
}

// ─── Factory ──────────────────────────────────────────────────────────────────

type CallbackWrapper = <A extends unknown[]>(fn: (...args: A) => void, timeMs: number) => Cancelable<A>;

function createRateLimited<T>(
	wrap: CallbackWrapper,
	valueOrSignal: T | Signal<T>,
	timeMs: number,
	options?: RateLimitedOptions<T>,
): RateLimitedSignal<T> | RateLimitedWritableSignal<T> {
	const sourceIsSignal = isSignal<T>(valueOrSignal);
	const initialValue = sourceIsSignal ? valueOrSignal.peek() : valueOrSignal;
	const output = signal(initialValue, options);
	const rateLimitedSet = wrap((value: T) => output.set(value), timeMs);

	const cancelOnDisconnect = (): void => {
		if (peekCurrentHost() !== null) {
			use({
				hostDisconnected(): void {
					rateLimitedSet.cancel();
				},
			});
		}
	};

	if (sourceIsSignal) {
		const source = valueOrSignal;
		const ref = effect([source], ([value]) => {
			rateLimitedSet(value);
		});
		cancelOnDisconnect();
		return Object.assign(output.asReadonly(), {
			dispose(): void {
				rateLimitedSet.cancel();
				ref.dispose();
			},
		}) as RateLimitedSignal<T>;
	}

	const proxied = proxySignal(
		output,
		{ set: (_source, value: T) => rateLimitedSet(value) },
		{ equal: options?.equals },
	);
	cancelOnDisconnect();
	return Object.assign(proxied, {
		dispose(): void {
			rateLimitedSet.cancel();
		},
	}) as RateLimitedWritableSignal<T>;
}

// ─── throttled ──────────────────────────────────────────────────────────────

/** Wrap a source signal → read-only signal mirroring it at most once per `timeMs` (leading + trailing). */
export function throttled<T>(source: Signal<T>, timeMs: number, options?: RateLimitedOptions<T>): RateLimitedSignal<T>;
/** Create a writable signal with immediate reads but throttled writes. */
export function throttled<T>(value: T, timeMs: number, options?: RateLimitedOptions<T>): RateLimitedWritableSignal<T>;
export function throttled<T>(valueOrSignal: T | Signal<T>, timeMs: number, options?: RateLimitedOptions<T>) {
	return createRateLimited(throttleCallback, valueOrSignal, timeMs, options);
}

// ─── debounced ──────────────────────────────────────────────────────────────

/** Wrap a source signal → read-only signal that mirrors it `timeMs` after the last change (trailing). */
export function debounced<T>(source: Signal<T>, timeMs: number, options?: RateLimitedOptions<T>): RateLimitedSignal<T>;
/** Create a writable signal with immediate reads but debounced writes. */
export function debounced<T>(value: T, timeMs: number, options?: RateLimitedOptions<T>): RateLimitedWritableSignal<T>;
export function debounced<T>(valueOrSignal: T | Signal<T>, timeMs: number, options?: RateLimitedOptions<T>) {
	return createRateLimited(debounceCallback, valueOrSignal, timeMs, options);
}
