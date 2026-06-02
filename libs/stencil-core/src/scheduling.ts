/**
 * @ssv/stencil-core — scheduling.ts
 *
 * Framework-agnostic, timer-based callback wrappers.
 */

/** A wrapped callback that can be cancelled, clearing any pending invocation. */
export type Cancelable<A extends unknown[]> = ((...args: A) => void) & {
	/** Clear the pending timer (if any) and drop buffered trailing args. */
	cancel: () => void;
};

/**
 * Leading + trailing throttle.
 *
 * The first call in an idle window invokes `fn` immediately. Further calls
 * within `timeMs` are coalesced: the most recent arguments are flushed once the
 * window elapses (trailing edge). Guarantees `fn` runs at most once per `timeMs`.
 *
 * `timeMs` is a static number. (A reactive `timeMs` would require recreating the
 * wrapper when it changes — a possible future enhancement.)
 */
export function throttleCallback<A extends unknown[]>(fn: (...args: A) => void, timeMs: number): Cancelable<A> {
	// Start in the past so the very first call always fires on the leading edge,
	// independent of the absolute clock value (matters under fake timers).
	let last = Number.NEGATIVE_INFINITY;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let trailingArgs: A | null = null;

	const invoke = (args: A): void => {
		last = Date.now();
		fn(...args);
	};

	const wrapped = ((...args: A): void => {
		const now = Date.now();
		const remaining = timeMs - (now - last);
		if (remaining <= 0) {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			invoke(args);
			return;
		}
		trailingArgs = args;
		timer ??= setTimeout(() => {
			timer = null;
			if (trailingArgs !== null) {
				const pending = trailingArgs;
				trailingArgs = null;
				invoke(pending);
			}
		}, remaining);
	}) as Cancelable<A>;

	wrapped.cancel = (): void => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		trailingArgs = null;
	};

	return wrapped;
}

/**
 * Trailing-edge debounce.
 *
 * Each call resets the timer; `fn` runs once `timeMs` has elapsed since the
 * last call, with the most recent arguments.
 *
 * `timeMs` is a static number.
 */
export function debounceCallback<A extends unknown[]>(fn: (...args: A) => void, timeMs: number): Cancelable<A> {
	let timer: ReturnType<typeof setTimeout> | null = null;

	const wrapped = ((...args: A): void => {
		if (timer !== null) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = null;
			fn(...args);
		}, timeMs);
	}) as Cancelable<A>;

	wrapped.cancel = (): void => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	return wrapped;
}
