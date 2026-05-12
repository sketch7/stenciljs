import { createStore } from "@ssv/tanstack.stenciljs-store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

export type TanTodoState = {
	todos: Todo[];
	nextId: number;
};

export const todoStore = createStore<TanTodoState>({
	todos: [],
	nextId: 1,
});
