import { getElement } from "@stencil/core";

import { use } from "../hooks/use";
import { CONTEXT_EVENT } from "./context";
import type { ContextEventDetail, ContextKey, ContextRef } from "./context";

/**
 * Consumes the nearest ancestor provider for the given context.
 *
 * Returns a {@link ContextRef} whose `.current` property holds the resolved value.
 * The value is resolved during `hostConnected` (i.e. before the first render), so
 * `.current` is always available by the time `render()` runs.
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
export function useContext<T>(key: ContextKey<T>): ContextRef<T> {
	// Mutable cell — set once in hostConnected, read during render.
	const ref = { current: undefined as unknown as T };

	// Side-effect factory form: registers lifecycle hooks without returning a value from use().
	use(host => ({
		hostConnected() {
			// getElement() resolves the real host element — in lazy (hydrate/SSR)
			// builds the component instance is not the DOM element.
			const hostEl = getElement(host);
			let resolved = false;

			// Build the event with the host document's own CustomEvent constructor.
			// During SSR/hydrate that is mock-doc's CustomEvent, whose target /
			// currentTarget are writable (mock-doc's dispatchEvent assigns to them);
			// the native CustomEvent's are read-only and would make SSR dispatch throw.
			const CustomEventCtor = hostEl.ownerDocument?.defaultView?.CustomEvent ?? CustomEvent;

			const event = new CustomEventCtor<ContextEventDetail<T>>(CONTEXT_EVENT, {
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

			hostEl.dispatchEvent(event);

			if (!resolved) {
				// Falls back to the shared singleton (throws if no defaultFactory).
				ref.current = key.getDefault();
			}
		},
	}));

	return ref as ContextRef<T>;
}
