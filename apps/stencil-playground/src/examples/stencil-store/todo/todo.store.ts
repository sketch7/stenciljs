import { createStore } from "@stencil/store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

const { state } = createStore<{ todos: Todo[]; nextId: number; hiddenTick: number }>({
	todos: [],
	nextId: 1,
	hiddenTick: 0,
});

export const todoStore = state;
