import { use } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { makeTransferKey, useTransferState } from "@ssv/stencil-core/transfer-state";
import { dehydrate, hydrate } from "@tanstack/query-core";
import type { DehydratedState, QueryClient } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";

/**
 * Options for {@link useQueryHydration}.
 */
export type UseQueryHydrationOptions = {
	/**
	 * QueryClient to hydrate. Defaults to the nearest client from context.
	 *
	 * Pass an explicit client to bypass context — useful when hosting multiple clients
	 * or in unit tests.
	 */
	client?: QueryClient | Ref<QueryClient>;
	/**
	 * Key suffix for scoping multiple QueryClients within a single {@link TransferState} scope.
	 * Omit when only one QueryClient uses the scope.
	 *
	 * Internal transfer keys: `__tsq` (no suffix) or `__tsq-${key}` (with suffix).
	 *
	 * @example
	 * ```ts
	 * // Two clients, same TransferState scope:
	 * useQueryHydration({ key: "posts" });
	 * useQueryHydration({ client: this.#usersClient, key: "users" });
	 * ```
	 */
	key?: string;
};

/**
 * Wires SSR dehydration and client hydration for a `QueryClient` via `TransferState`.
 *
 * Call inside `setup()` **after** `provideTransferState` and `provideQueryClient`.
 * Pair with {@link usePrefetchQuery} to seed the cache on `hostWillLoad` during SSR;
 * set `staleTime` on the query to prevent an immediate client-side re-fetch.
 *
 * @example
 * ```ts
 * // Basic — hydrates the QueryClient from context
 * readonly #qc = provideQueryClient();
 * readonly _ = this.setup(() => {
 *   provideTransferState("my-scope");
 *   useQueryHydration();
 * });
 * ```
 *
 * @example
 * ```ts
 * // Full SSR pattern — prefetch on server, transfer to client, skip re-fetch with staleTime
 * readonly #qc = provideQueryClient();
 * readonly _prefetch = usePrefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchData, staleTime: 5 * 60_000 });
 * readonly _ = this.setup(() => {
 *   provideTransferState("my-scope");
 *   useQueryHydration();
 * });
 * ```
 *
 * @example
 * ```ts
 * // Multiple QueryClients sharing one TransferState scope
 * readonly #posts = provideQueryClient();
 * readonly #users = new QueryClient();
 * readonly _ = this.setup(() => {
 *   provideTransferState("my-scope");
 *   useQueryHydration({ key: "posts" });
 *   useQueryHydration({ client: this.#users, key: "users" });
 * });
 * ```
 */
export function useQueryHydration(options?: UseQueryHydrationOptions): void {
	const transferKey = `__tsq${options?.key ? `-${options.key}` : ""}`;
	const DEHYDRATED_KEY = makeTransferKey<DehydratedState>(transferKey);
	const ts = useTransferState();
	const clientRef = useQueryClient(options?.client);

	use({
		hostConnected() {
			const dehydrated = ts.get(DEHYDRATED_KEY);
			if (dehydrated !== undefined) {
				hydrate(clientRef.current, dehydrated);
			}
			ts.setLazy(DEHYDRATED_KEY, () => dehydrate(clientRef.current));
		},
	});
}
