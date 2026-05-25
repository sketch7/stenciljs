import { createContext, provideContext, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";

import { useSSE } from "./sse.hooks";
import type { SSEContext, SSEController, SSEEventMap, SSEOptions } from "./sse.types";

/**
 * Creates a typed SSE context token for sharing an {@link SSEController} through the
 * component tree. Pass the token to {@link provideSSE} in a parent and to
 * {@link useSSEContext} in any descendant.
 *
 * @example
 * ```ts
 * export const draftSSEContext = createSSEContext<DraftSSEEvents>("draftSSE");
 * ```
 */
export function createSSEContext<TEvents extends object = SSEEventMap>(name?: string): SSEContext<TEvents> {
	return { _key: createContext<SSEController<TEvents>>(undefined, { name: name ?? "SSEContext" }) };
}

/**
 * Creates an SSE connection (via {@link useSSE}) **and** makes it available to all
 * descendant components via context. Call this in the component that owns the lifecycle
 * of the connection.
 *
 * @returns The {@link SSEController} — same object shared with consumers.
 *
 * @example
 * ```ts
 * // Parent component constructor:
 * provideSSE(draftSSEContext, () => draftId ? `${BASE_URL}/api/drafts/${draftId}/events` : null, {
 *   on: { "draft-updated": data => client.invalidateQueries({ queryKey: [...] }) },
 * });
 * ```
 */
export function provideSSE<TEvents extends object>(
	context: SSEContext<TEvents>,
	getUrl: () => string | null | undefined,
	options?: SSEOptions<TEvents>,
): SSEController<TEvents> {
	const controller = useSSE(getUrl, options);
	provideContext(context._key, controller);
	return controller;
}

/**
 * Resolves the nearest ancestor {@link SSEController} provided via {@link provideSSE}.
 * Returns a {@link Ref} that is safe to read in `render()` — resolved by `hostWillLoad`.
 *
 * @example
 * ```ts
 * // Child component constructor:
 * const sse = useSSEContext(draftSSEContext);
 *
 * // In render():
 * <span>{sse.current.status()}</span>
 * ```
 */
export function useSSEContext<TEvents extends object>(context: SSEContext<TEvents>): Ref<SSEController<TEvents>> {
	return useContext(context._key);
}
