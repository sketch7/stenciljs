import { computed } from "@ssv/stencil-signals";
import { createStore } from "@ssv/stencil-signals/extensions";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

export const todoStore = createStore({ todos: [] as Todo[], nextId: 1, hiddenTick: 0 }, s => ({
	completedCount: computed(() => s.todos.filter(t => t.completed).length),
	pendingCount: computed(() => s.todos.filter(t => !t.completed).length),
}));
