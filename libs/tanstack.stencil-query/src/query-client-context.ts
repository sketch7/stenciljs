import {
	createContext,
	makeTransferKey,
	provideContext,
	provideTransferState,
	use,
	useContext,
} from "@ssv/stencil.core";
import type { ContextRef } from "@ssv/stencil.core";
import { dehydrate, hydrate, QueryClient } from "@tanstack/query-core";
import type { DehydratedState } from "@tanstack/query-core";

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
	/**
	 * When set, automatically dehydrates the `QueryClient` into a `<script type="application/json">` tag
	 * on the server and hydrates it back on the client, preventing a re-fetch on initial load.
	 *
	 * Must be unique per page. Corresponds to the `id` attribute of the injected script tag (`ssv-ts-tanstack-query-{ssrKey}`).
	 *
	 * @example
	 * ```ts
	 * readonly #queryClient = provideQueryClient({ ssrKey: 'posts' });
	 * ```
	 */
	ssrKey?: string;
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
 * readonly #queryClient = provideQueryClient({ ssrKey: 'posts' });
 * ```
 */
export function provideQueryClient(clientOrOptions?: QueryClient | ProvideQueryClientOptions): QueryClient {
	const qc =
		clientOrOptions instanceof QueryClient
			? clientOrOptions
			: ((clientOrOptions as ProvideQueryClientOptions | undefined)?.client ?? new QueryClient());

	use({
		hostConnected() {
			qc.mount();
		},
		hostDisconnected() {
			qc.unmount();
		},
	});

	provideContext(queryClientKey, qc);

	const ssrKey =
		clientOrOptions instanceof QueryClient
			? undefined
			: (clientOrOptions as ProvideQueryClientOptions | undefined)?.ssrKey;

	if (ssrKey) {
		const DEHYDRATED_KEY = makeTransferKey<DehydratedState>("state");
		const ts = provideTransferState(`tanstack-query-${ssrKey}`);

		use({
			hostWillRender() {
				ts.set(DEHYDRATED_KEY, dehydrate(qc));
			},
			hostConnected() {
				const dehydrated = ts.get(DEHYDRATED_KEY);
				if (dehydrated !== undefined) {
					hydrate(qc, dehydrated);
				}
			},
		});
	}

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
