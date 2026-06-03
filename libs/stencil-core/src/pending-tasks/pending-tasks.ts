import { use } from "../hooks/use";
import { detectServer } from "../transfer-state";

/**
 * Handle returned by {@link usePendingTasks}. Each `add()` call registers an async factory
 * that must resolve before SSR renders the component.
 *
 * @example
 * ```ts
 * export function useConfig() {
 *   const tasks = usePendingTasks();
 *   tasks.add(() => configRef.current?.prefetch());
 *   return configRef;
 * }
 * ```
 */
export type PendingTasksHandle = {
	/**
	 * Schedules `factory` to run and resolve during `hostWillLoad` on the server.
	 * On the client this is a no-op — the factory is never called.
	 *
	 * Must be called during component initialization (same constraint as any `use()`-based hook).
	 */
	add: (factory: () => Promise<unknown> | void) => void;
};

/**
 * Returns a {@link PendingTasksHandle} bound to the current component.
 *
 * Each `add()` call registers a controller whose `hostWillLoad` runs the factory and
 * returns its promise. Stencil awaits all controller promises in parallel before calling
 * `render()`, ensuring SSR output reflects data fetched by the factories.
 *
 * Both `usePendingTasks()` and `handle.add(factory)` must be called during component
 * initialization (class field initializers or `setup()`).
 *
 * @example
 * ```ts
 * // In a reusable hook
 * export function useFoo() {
 *   const tasks = usePendingTasks();
 *   tasks.add(() => preloadFoo());
 *   return fooRef;
 * }
 * ```
 *
 * @example
 * ```ts
 * // Directly in setup()
 * readonly _ = this.setup(() => {
 *   const tasks = usePendingTasks();
 *   tasks.add(() => warmCache());
 * });
 * ```
 */
export function usePendingTasks(): PendingTasksHandle {
	return {
		add(factory: () => Promise<unknown> | void): void {
			use(() => ({
				hostWillLoad(): Promise<void> | void {
					if (!detectServer()) {
						return;
					}
					const r = factory();
					return r === null || r === undefined ? undefined : (r as Promise<void>);
				},
			}));
		},
	};
}
