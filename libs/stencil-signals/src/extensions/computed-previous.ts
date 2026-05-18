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
