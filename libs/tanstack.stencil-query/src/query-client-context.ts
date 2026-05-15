import { createContext, provideContext, use, useContext } from "@ssv/stencil.core";
import type { ContextRef } from "@ssv/stencil.core";
import { QueryClient } from "@tanstack/query-core";

/**
 * Context key used to distribute a `QueryClient` through the component tree.
 * Populated by {@link provideQueryClient}; consumed by {@link useQueryClient},
 * {@link useQuery}, and {@link useMutation}.
 */
export const queryClientKey = createContext<QueryClient>(undefined, { name: "QueryClient" });

/**
 * Provides a `QueryClient` to all descendant components and mounts/unmounts it with the host lifecycle.
 *
 * Call in a class field initializer. Returns the client so it can be stored if needed.
 *
 * @example
 * ```ts
 * export class AppRoot extends SsvElement {
 *   readonly #queryClient = provideQueryClient();
 * }
 * ```
 *
 * @example
 * ```ts
 * readonly #queryClient = provideQueryClient(new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
 * ```
 */
export function provideQueryClient(client?: QueryClient): QueryClient {
	const qc = client ?? new QueryClient();

	use({
		hostConnected() {
			qc.mount();
		},
		hostDisconnected() {
			qc.unmount();
		},
	});

	provideContext(queryClientKey, qc);
	return qc;
}

/**
 * Resolves the nearest `QueryClient` from the component tree, or returns the explicit client if provided.
 *
 * Returns a {@link ContextRef} whose `.current` is available after `hostConnected` (before the first render).
 * Pass an explicit `client` to bypass context — useful in tests.
 *
 * @example
 * ```ts
 * readonly #client = useQueryClient();
 *
 * // in event handler or onSuccess:
 * this.#client.current.invalidateQueries({ queryKey: ['posts'] });
 * ```
 */
export function useQueryClient(client?: QueryClient): ContextRef<QueryClient> {
	if (client) {
		return { current: client };
	}
	return useContext(queryClientKey);
}
