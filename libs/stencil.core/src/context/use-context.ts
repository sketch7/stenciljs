import { use } from "../hooks/use";
import { createWritableRef } from "../ref";
import type { Ref } from "../ref";
import { CONTEXT_EVENT } from "./context";
import type { ContextEventDetail, ContextKey } from "./context";

/**
 * Consumes the nearest ancestor provider for the given context.
 *
 * Returns a {@link Ref} whose `.current` property holds the resolved value.
 * The value is resolved during `hostConnected` (i.e. before the first render), so
 * `.current` is always available by the time `render()` runs. The ref is also callable —
 * `ref()` returns the same value as `ref.current`.
 *
 * Resolution order:
 * 1. Nearest ancestor with `provideContext(key)` — found via a bubbling DOM event.
 * 2. The singleton created by the `defaultFactory` passed to `createContext`.
 * 3. Throws if neither is available.
 *
 * @param key - The context token created by {@link createContext}.
 *
 * @example
 * ```ts
 * readonly #storeRef = useContext(CounterContext);
 *
 * render() {
 *   return <div>{this.#storeRef.current.state.count}</div>;
 * }
 * ```
 */
export function useContext<T>(key: ContextKey<T>): Ref<T> {
	const ref = createWritableRef<T>();

	// Side-effect factory form: registers lifecycle hooks without returning a value from use().
	use(host => ({
		hostConnected() {
			let resolved = false;

			const event = new CustomEvent<ContextEventDetail<T>>(CONTEXT_EVENT, {
				bubbles: true,
				// crosses shadow-DOM boundaries for deeply nested components
				composed: true,
				detail: {
					contextId: key.id,
					callback(value: T) {
						ref.current = value;
						resolved = true;
					},
				},
			});

			host.dispatchEvent(event);

			if (!resolved) {
				// Falls back to the shared singleton (throws if no defaultFactory).
				ref.current = key.getDefault();
			}
		},
	}));

	return ref.asReadonly();
}
