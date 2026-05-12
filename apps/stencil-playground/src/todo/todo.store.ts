import { createStore } from "@stencil/store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

const { state } = createStore<{ todos: Todo[]; nextId: number }>({
	todos: [],
	nextId: 1,
});

export const todoStore = state;
