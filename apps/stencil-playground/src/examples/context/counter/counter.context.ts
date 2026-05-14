import { createContext } from "@ssv/stencil.core";
import { createStore } from "@ssv/tanstack.stencil-store";

export type CounterState = { count: number };

export function createCounterStore(initial = 0) {
	return createStore({ count: initial } satisfies CounterState, ({ setState }) => ({
		increment() {
			setState(s => ({ count: s.count + 1 }));
		},
		decrement() {
			setState(s => ({ count: s.count - 1 }));
		},
	}));
}

export type CounterStore = ReturnType<typeof createCounterStore>;

export const CounterContext = createContext<CounterStore>(() => createCounterStore(), { name: "counter" });
