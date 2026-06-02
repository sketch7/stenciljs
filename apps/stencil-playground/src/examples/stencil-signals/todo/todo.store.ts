import { computed } from "@ssv/stencil-signals";
import {
	signalStore,
	signalStoreFeature,
	type,
	withState,
	withComputed,
	withMethods,
	patchState,
	withConfig,
} from "@ssv/stencil-signals/store";

export type Todo = {
	id: number;
	text: string;
	completed: boolean;
};

function withTodoComputed() {
	return signalStoreFeature(
		type<{ state: { todos: Todo[] } }>(),
		withComputed(s => ({
			completedCount: computed(() => s.todos().filter(t => t.completed).length),
			pendingCount: computed(() => s.todos().filter(t => !t.completed).length),
		})),
	);
}

export const todoStore = signalStore(
	withConfig({ isStateWritable: true }),
	withState({ todos: [] as Todo[], nextId: 1 }),
	withTodoComputed(),
	withMethods(s => ({
		add(text: string) {
			patchState(s, state => {
				const { todos, nextId } = state as { todos: Todo[]; nextId: number };
				return {
					todos: [...todos, { id: nextId, text, completed: false }],
					nextId: nextId + 1,
				};
			});
		},
		toggle(id: number) {
			s.todos.update(todos => todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
		},
		remove(id: number) {
			s.todos.update(todos => todos.filter(t => t.id !== id));
		},
	})),
);
