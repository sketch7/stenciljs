import { createStore } from "@ssv/tanstack.stencil-store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

export type TanTodoState = {
	todos: Todo[];
	nextId: number;
};

export const todoStore = createStore({ todos: [] as Todo[], nextId: 1 } satisfies TanTodoState, ({ setState }) => ({
	add(text: string) {
		const trimmed = text.trim();
		if (!trimmed) {
			return;
		}
		setState(prev => ({
			todos: [...prev.todos, { id: prev.nextId, text: trimmed, completed: false }],
			nextId: prev.nextId + 1,
		}));
	},
	toggle(id: number) {
		setState(prev => ({
			...prev,
			todos: prev.todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
		}));
	},
	delete(id: number) {
		setState(prev => ({
			...prev,
			todos: prev.todos.filter(t => t.id !== id),
		}));
	},
}));

/** Derived store — recomputes whenever `todoStore` state changes. */
export const todoStatsStore = createStore(() => {
	const { todos } = todoStore.state;
	return {
		completed: todos.filter(t => t.completed).length,
		total: todos.length,
	};
});
