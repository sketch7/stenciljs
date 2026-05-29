import { computed } from "@ssv/stencil-signals";
import { signalStore, withState, withComputed, withMethods, patchState, withConfig } from "@ssv/stencil-signals/store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

export const todoStore = signalStore(
	withConfig({ isStateWritable: true }),
	withState({ todos: [] as Todo[], nextId: 1 }),
	withComputed(s => ({
		completedCount: computed(() => s.todos().filter(t => t.completed).length),
		pendingCount: computed(() => s.todos().filter(t => !t.completed).length),
	})),
	withMethods(s => ({
		add(text: string) {
			console.warn(">>> Adding todo");

			patchState(s, state => ({
				todos: [...state.todos, { id: state.nextId, text, completed: false }],
				nextId: state.nextId + 1,
			}));
		},
		toggle(id: number) {
			console.warn(">>> Toggling todo");
			s.todos.update(todos => todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
		},
		remove(id: number) {
			s.todos.update(todos => todos.filter(t => t.id !== id));
		},
	})),
);
