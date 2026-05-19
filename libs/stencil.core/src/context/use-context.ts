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
		// contextPending: true while a provider is needed but not yet found.
		// Used by hostWillLoad as a fallback for environments without window (SSR).
		let contextPending = false;
		// pendingWindowListener: true while a PROVIDER_CONNECTED_EVENT listener is
		// registered on window. Cleaned up in hostDisconnected and when resolved.
		let pendingWindowListener = false;

		const dispatchContextRequest = (): boolean => {
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
			host.getElement().dispatchEvent(event);
			return resolved;
		};

		const onProviderConnected = (event: Event): void => {
			const e = event as CustomEvent<ProviderConnectedDetail>;
			if (e.detail.contextId !== key.id) {
				return;
			}
			if (dispatchContextRequest()) {
				if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
					window.removeEventListener(PROVIDER_CONNECTED_EVENT, onProviderConnected);
				}
				pendingWindowListener = false;
				contextPending = false;
				// Trigger a re-render in case the component has already rendered
				// with a placeholder (e.g. provider added to DOM after first paint).
				try {
					host.requestUpdate();
				} catch {
					// Stencil may not have fully initialised the component yet during SSR hydration;
					// hostWillLoad / render will still see the resolved ref.current value.
				}
			}
		};

		return {
			hostConnected() {
				if (!dispatchContextRequest()) {
					try {
						// Falls back to the shared singleton (throws if no defaultFactory).
						ref.current = key.getDefault();
					} catch {
						// No provider connected AND no default factory.
						// Primary path (browser): subscribe to PROVIDER_CONNECTED_EVENT.
						// Provider dispatches this event on window immediately after
						// registering its DOM listener, so the retry in onProviderConnected
						// is guaranteed to find the provider.
						contextPending = true;
						if (
							typeof window !== "undefined" &&
							typeof window.addEventListener === "function" &&
							!pendingWindowListener
						) {
							window.addEventListener(PROVIDER_CONNECTED_EVENT, onProviderConnected);
							pendingWindowListener = true;
						}
					}
				}
			},
			hostWillLoad() {
				// Fallback for SSR / environments without window, and as a safety net
				// for edge cases where the window event fires between tasks.
				if (!contextPending) {
					return;
				}
				// Clean up any window listener that is still pending.
				if (pendingWindowListener) {
					if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
						window.removeEventListener(PROVIDER_CONNECTED_EVENT, onProviderConnected);
					}
					pendingWindowListener = false;
				}
				contextPending = false;
				if (!dispatchContextRequest()) {
					// Provider still not connected — fall back to singleton or throw.
					ref.current = key.getDefault();
				}
			},
			hostDisconnected() {
				if (pendingWindowListener) {
					if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
						window.removeEventListener(PROVIDER_CONNECTED_EVENT, onProviderConnected);
					}
					pendingWindowListener = false;
				}
			},
		};
	});

	return ref.asReadonly();
}
