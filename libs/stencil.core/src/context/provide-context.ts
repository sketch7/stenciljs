import { use } from "../hooks/use";
import { CONTEXT_EVENT } from "./context";
import type { ContextEventDetail, ContextKey } from "./context";

/**
 * Registers the current component as a provider for the given context.
 * Intercepts `__ssv:context-request` events from descendant consumers and
 * responds with the provided value.
 *
 * Returns the context value so it can be used directly within the component.
 *
 * @param key - The context token created by {@link createContext}.
 * @param valueOrFactory - The value to provide, a factory that creates it, or omitted
 *   to create a fresh instance from `key`'s `defaultFactory`.
 *
 * @example
 * ```ts
 * // Fresh instance per provider (isolated scope)
 * readonly store = provideContext(CounterContext);
 *
 * // Explicit value
 * readonly store = provideContext(CounterContext, createCounterStore(10));
 *
 * // Factory
 * readonly store = provideContext(CounterContext, () => createCounterStore(10));
 * ```
 */
export function provideContext<T>(key: ContextKey<T>, valueOrFactory?: T | (() => T)): T {
	const value =
		typeof valueOrFactory === "function"
			? (valueOrFactory as () => T)()
			: valueOrFactory === undefined
				? key.createInstance()
				: valueOrFactory;

	const handleRequest = (event: Event): void => {
		const e = event as CustomEvent<ContextEventDetail<T>>;
		if (e.detail.contextId === key.id) {
			e.stopPropagation();
			e.detail.callback(value);
		}
	};

	// host is ReactiveControllerHost; at runtime it is also the HTMLElement (Stencil component),
	// which is required to attach the DOM event listener.
	use(host => {
		const hostEl = host as unknown as HTMLElement;
		return {
			hostConnected() {
				hostEl.addEventListener(CONTEXT_EVENT, handleRequest);
			},
			hostDisconnected() {
				hostEl.removeEventListener(CONTEXT_EVENT, handleRequest);
			},
		};
	});

	return value;
}
