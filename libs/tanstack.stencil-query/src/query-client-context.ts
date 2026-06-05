import { createContext, createRef, isRef, provideContext, use, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { QueryClient } from "@tanstack/query-core";

import { useQueryHydration } from "./use-query-hydration";

/**
 * Context key used to distribute a `QueryClient` through the component tree.
 * Populated by {@link provideQueryClient}; consumed by {@link useQueryClient},
 * {@link useQuery}, and {@link useMutation}.
 */
export const queryClientKey = createContext<QueryClient>(undefined, { name: "QueryClient" });

/**
 * Default `staleTime` (ms) applied to an auto-created `QueryClient` when
 * `provideQueryClient({ hydrate: true })` is used without an explicit `client`.
 *
 * Prevents hydrated queries from refetching immediately on the client, which would
 * discard data shipped from the server. Mirrors the React SSR guidance.
 */
export const DEFAULT_SSR_STALE_TIME = 60_000;

/**
 * Options for {@link provideQueryClient}.
 */
export type ProvideQueryClientOptions = {
	/** An existing `QueryClient` instance to use. Defaults to a new instance. */
	client?: QueryClient;
	/**
	 * Wire SSR dehydration + client hydration in one call.
	 * `true` → scope "query". Pass an object to customize the scope or key.
	 *
	 * When set (and no explicit `client` is provided), the auto-created client defaults
	 * `queries.staleTime` to {@link DEFAULT_SSR_STALE_TIME} so hydrated data is not
	 * immediately discarded by a client refetch.
	 *
	 * @example
	 * ```ts
	 * readonly #qc = provideQueryClient({ hydrate: true });
	 * ```
	 */
	hydrate?: boolean | { scope?: string; key?: string };
	/**
	 * Default `staleTime` for the auto-created client when `hydrate` is set.
	 * Defaults to {@link DEFAULT_SSR_STALE_TIME}. Ignored when an explicit `client` is provided.
	 */
	staleTime?: number;
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
 * readonly #queryClient = provideQueryClient({ client: new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }) });
 * ```
 *
 * @example
 * ```ts
 * // SSR dehydration + client hydration in one call:
 * readonly #qc = provideQueryClient({ hydrate: true });
 * ```
 *
 * @example
 * ```ts
 * // Manual wiring — call useQueryHydration() after:
 * readonly #qc = provideQueryClient();
 * readonly _ = this.setup(() => {
 *   provideTransferState('posts');
 *   useQueryHydration();
 * });
 * ```
 */
export function provideQueryClient(clientOrOptions?: QueryClient | ProvideQueryClientOptions): QueryClient {
	const opts = clientOrOptions instanceof QueryClient ? { client: clientOrOptions } : (clientOrOptions ?? {});
	const { hydrate, staleTime } = opts;

	// Auto-create a client with a sensible staleTime when hydrate is set and no explicit client passed.
	const qc =
		opts.client ??
		new QueryClient(
			hydrate ? { defaultOptions: { queries: { staleTime: staleTime ?? DEFAULT_SSR_STALE_TIME } } } : undefined,
		);

	use({
		hostConnected() {
			qc.mount();
		},
		hostDisconnected() {
			qc.unmount();
		},
	});

	provideContext(queryClientKey, qc);

	if (hydrate) {
		const scope = hydrate === true ? "query" : (hydrate.scope ?? "query");
		const key = typeof hydrate === "object" ? hydrate.key : undefined;
		provideTransferState(scope);
		useQueryHydration({ client: qc, key });
	}

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
