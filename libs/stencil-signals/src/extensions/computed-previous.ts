/**
 * @ssv/stencil-signals — utils/computed-previous.ts
 *
 * `computedPrevious(sig)` returns a read-only signal whose value is always
 * the *previous* value of the source signal — i.e. the value it held before
 * the most recent change.
 *
 * On the very first read, before any change has occurred, the previous value
 * is `undefined` (or the explicit `initialValue` you supply).
 *
 * ## Usage
 *
 * ```ts
 * const count = signal(0);
 * const prevCount = computedPrevious(count);
 *
 * prevCount.get(); // undefined  (no prior value yet)
 * count.set(5);
 * prevCount.get(); // 0          (the value before the last set)
 * count.set(10);
 * prevCount.get(); // 5
 * ```
 *
 * ### With an explicit initial value
 *
 * ```ts
 * const prevCount = computedPrevious(count, -1);
 * prevCount.get(); // -1  (before any change)
 * ```
 *
 * ### In a component (e.g. for transition direction)
 *
 * ```ts
 * const page = signal(0);
 * const prevPage = computedPrevious(page);
 *
 * render() {
 *   const direction = page.get() > (prevPage.get() ?? 0) ? 'forward' : 'back';
 *   return <div class={direction}>...</div>;
 * }
 * ```
 */

import { getAdapter } from "../adapters/active";
import type { Signal } from "../adapters/types";

enum Kind {
	INITIAL = 0,
	COMPUTED = 1,
}

type State<T> = { kind: Kind.INITIAL } | { kind: Kind.COMPUTED; previousValue: T; currentValue: T };

/**
 * Returns a derived signal holding the previous value of `source`.
 *
 * @param source       Any readable signal (State or Computed).
 * @param initialValue Value returned before the first change. Defaults to `undefined`.
 */
export function computedPrevious<T>(source: Signal<T>, initialValue?: T): Signal<T | undefined> {
	const adapter = getAdapter();
	const initialSeen = adapter.untrack(() => source());
	let state: State<T> = { kind: Kind.INITIAL };

	return adapter.createComputed(() => {
		const currentValue = source();

		if (state.kind === Kind.INITIAL) {
			if (!Object.is(currentValue, initialSeen)) {
				state = { kind: Kind.COMPUTED, previousValue: initialSeen, currentValue };
				return initialSeen;
			}
			state = { kind: Kind.COMPUTED, previousValue: currentValue, currentValue };
			return initialValue;
		}

		state.previousValue = state.currentValue;
		state.currentValue = currentValue;
		return state.previousValue;
	});
}
