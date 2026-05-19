import { use } from "../hooks/use";
import { CONTEXT_EVENT, PROVIDER_CONNECTED_EVENT } from "./context";
import type { ContextEventDetail, ContextKey, ProviderConnectedDetail } from "./context";

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

	use(host => ({
		hostConnected() {
			host.getElement().addEventListener(CONTEXT_EVENT, handleRequest);
			// Notify any consumers that connected before this provider and are waiting.
			// Dispatched after the DOM listener is registered so re-tries from consumers succeed.
			globalThis.dispatchEvent(
				new CustomEvent<ProviderConnectedDetail>(PROVIDER_CONNECTED_EVENT, {
					detail: { contextId: key.id },
				}),
			);
		},
		hostDisconnected() {
			host.getElement().removeEventListener(CONTEXT_EVENT, handleRequest);
		},
	}));

	return value;
}
