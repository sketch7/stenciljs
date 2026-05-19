import { use } from "../hooks/use";
import { createWritableRef } from "../ref";
import type { Ref } from "../ref";
import { CONTEXT_EVENT, PROVIDER_CONNECTED_EVENT } from "./context";
import type { ContextEventDetail, ContextKey, ProviderConnectedDetail } from "./context";

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

	use(host => {
		// `undefined`  → context is resolved (no cleanup needed).
		// function ref → context is pending; call it to remove the window listener.
		//                In SSR / stubbed-window environments this is the no-op `() => {}`
		//                sentinel, which keeps hostWillLoad's retry path active.
		let cleanupPending: (() => void) | undefined;

		const dispatchContextRequest = (): boolean => {
			let resolved = false;
			host.getElement().dispatchEvent(
				new CustomEvent<ContextEventDetail<T>>(CONTEXT_EVENT, {
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
				}),
			);
			return resolved;
		};

		return {
			hostConnected() {
				if (!dispatchContextRequest()) {
					try {
						// Falls back to the shared singleton (throws if no defaultFactory).
						ref.current = key.getDefault();
					} catch {
						// No provider connected AND no default factory.
						if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
							// Subscribe on window so the provider notifies us synchronously when it
							// connects — guaranteed before hostWillLoad runs, with no polling needed.
							const listener = (event: Event): void => {
								const e = event as CustomEvent<ProviderConnectedDetail>;
								if (e.detail.contextId !== key.id) {
									return;
								}
								if (dispatchContextRequest()) {
									cleanupPending?.();
									cleanupPending = undefined;
									try {
										// Re-render if the component already painted with a placeholder.
										host.requestUpdate();
									} catch {
										// Component may not be fully initialised yet during SSR hydration;
										// hostWillLoad / render will still see the resolved ref.current.
									}
								}
							};
							window.addEventListener(PROVIDER_CONNECTED_EVENT, listener);
							cleanupPending = () => window.removeEventListener(PROVIDER_CONNECTED_EVENT, listener);
						} else {
							// SSR / no window: cannot subscribe; use a no-op sentinel so
							// hostWillLoad knows it still needs to retry via the DOM event.
							cleanupPending = () => {};
						}
					}
				}
			},
			hostWillLoad() {
				// Runs after all connectedCallbacks in the tree, so the provider's DOM
				// listener is always registered by this point. Acts as a fallback for SSR
				// and an edge-case safety net for when the window event fires between tasks.
				if (!cleanupPending) {
					return;
				}
				cleanupPending();
				cleanupPending = undefined;
				if (!dispatchContextRequest()) {
					// Provider still not connected — fall back to singleton or throw.
					ref.current = key.getDefault();
				}
			},
			hostDisconnected() {
				cleanupPending?.();
				cleanupPending = undefined;
			},
		};
	});

	return ref.asReadonly();
}
