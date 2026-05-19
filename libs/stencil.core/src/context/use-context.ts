import { use } from "../hooks/use";
import { createWritableRef } from "../ref";
import type { Ref } from "../ref";
import { CONTEXT_EVENT, PROVIDER_CONNECTED_EVENT, createContextLogger } from "./context";
import type { ContextEventDetail, ContextKey, ProviderConnectedDetail } from "./context";

const log = createContextLogger("useContext");

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
 * During hydration, Stencil stamps an `s-id` attribute on server-rendered elements and uses
 * bottom-up init, so the provider may not yet be connected when this consumer's `hostConnected`
 * fires. In that case a global listener waits for the provider and `hostWillLoad` provides a
 * final safety net. Stencil removes the `s-id` DOM attribute early in `connectedCallback` but
 * keeps it as a JS property (`element["s-id"]`), which is the signal used here. In all other
 * modes (SSR, client navigation) init is top-down and the provider is already present, so the
 * listener and `hostWillLoad` logic are bypassed entirely.
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
				const hydrating = host.isHydrating();
				log(
					`hostConnected  tag=${host.getElement().tagName?.toLowerCase() ?? "?"}  contextId=${key.name}  hydrating=${hydrating}`,
				);

				if (dispatchContextRequest()) {
					log(`hostConnected  resolved immediately  contextId=${key.name}`);
					return;
				}
				if (!hydrating) {
					// Not hydrating: init is top-down (SSR or client navigation) — provider is
					// already connected if it exists. No listener needed; defer default resolution
					// to hostWillLoad so errors surface there rather than in connectedCallback.
					log(`hostConnected  not hydrating → deferring to hostWillLoad  contextId=${key.name}`);
					cleanupPending = () => {};
					return;
				}
				// Hydration: Stencil removes the "s-id" attribute during connectedCallback
				// but keeps it as a JS property. Bottom-up init — parent provider may not
				// have connected yet.
				// Subscribe for a late provider; hostWillLoad resolves once the tree is stable.
				log(`hostConnected  hydrating → subscribing for late provider  contextId=${key.name}`);
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
					log(`PROVIDER_CONNECTED_EVENT resolved  contextId=${key.name}`);

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
				// Hydration only: safety net if the PROVIDER_CONNECTED_EVENT fired between tasks
				// before hostWillLoad — cleanupPending is still set, so retry the DOM event now.
				if (!cleanupPending) {
					return;
				}
				log(`hostWillLoad  safety-net retry  contextId=${key.name}`);
				cleanupPending();
				cleanupPending = undefined;
				if (dispatchContextRequest()) {
					log(`hostWillLoad  resolved via retry  contextId=${key.name}`);
				} else {
					// Provider still not connected — fall back to singleton or throw.
					log(`hostWillLoad  provider absent → falling back to default  contextId=${key.name}`);
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
