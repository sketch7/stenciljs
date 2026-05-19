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
				if (dispatchContextRequest()) {
					return;
				}
				// Do not call getDefault() here — the hierarchy may not be stable yet
				// (bottom-up hydration: parent provider hasn't connected).
				// Always subscribe for a late provider; hostWillLoad resolves once stable.
				const listener = (event: Event): void => {
					const e = event as CustomEvent<ProviderConnectedDetail>;
					if (e.detail.contextId !== key.id) {
						return;
					}
					if (!dispatchContextRequest()) {
						return;
					}
					cleanupPending?.();
					cleanupPending = undefined;
					try {
						host.requestUpdate();
					} catch {
						// Component may not be fully initialized yet; hostWillLoad will still see the resolved ref.
					}
				};
				globalThis.addEventListener(PROVIDER_CONNECTED_EVENT, listener);
				cleanupPending = () => globalThis.removeEventListener(PROVIDER_CONNECTED_EVENT, listener);
			},
			hostWillLoad() {
				// Edge-case safety net: if the window event fired between tasks before
				// hostWillLoad, cleanupPending is still set — resolve via DOM event now.
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
