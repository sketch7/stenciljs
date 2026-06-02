import { createContext, createRef, isRef, provideContext, use, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { QueryClient } from "@tanstack/query-core";

/**
 * Context key used to distribute a `QueryClient` through the component tree.
 * Populated by {@link provideQueryClient}; consumed by {@link useQueryClient},
 * {@link useQuery}, and {@link useMutation}.
 */
export const queryClientKey = createContext<QueryClient>(undefined, { name: "QueryClient" });

/**
 * Options for {@link provideQueryClient}.
 */
export type ProvideQueryClientOptions = {
	/** An existing `QueryClient` instance to use. Defaults to a new instance. */
	client?: QueryClient;
};

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
 *
 * @example
 * ```ts
 * // SSR dehydration + client hydration — call useQueryHydration() after:
 * readonly #qc = provideQueryClient();
 * readonly _ = this.setup(() => {
 *   provideTransferState('posts');
 *   useQueryHydration();
 * });
 * ```
 */
export function provideQueryClient(clientOrOptions?: QueryClient | ProvideQueryClientOptions): QueryClient {
	const qc = clientOrOptions instanceof QueryClient ? clientOrOptions : (clientOrOptions?.client ?? new QueryClient());

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
 * Returns a {@link Ref} whose `.current` is available after `hostConnected` (before the first render).
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
export function useQueryClient(client?: QueryClient | Ref<QueryClient>): Ref<QueryClient> {
	if (!client) {
		return useContext(queryClientKey);
	}
	if (isRef<QueryClient>(client)) {
		return client;
	}
	return createRef(() => client);
}
