import { useContext } from "@ssv/stencil-core";
import { useSelector } from "@ssv/tanstack.stencil-store";

import type { CounterStore } from "./counter.context";
import { CounterContext } from "./counter.context";

export type UseCounter = {
	readonly store: CounterStore;
	readonly count: number;
	increment(): void;
	decrement(): void;
};

/** Composable hook — resolves the nearest {@link CounterContext} and subscribes to its count. */
export function useCounter(): UseCounter {
	const storeRef = useContext(CounterContext);
	const getCount = useSelector(
		() => storeRef.current,
		s => s.count,
	);

	return {
		get store() {
			return storeRef.current;
		},
		get count() {
			return getCount() ?? 0;
		},
		increment: () => storeRef.current.actions.increment(),
		decrement: () => storeRef.current.actions.decrement(),
	};
}
