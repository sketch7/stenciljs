import { createLogger, detectServer, use } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { makeTransferKey, useTransferState } from "@ssv/stencil-core/transfer-state";
import { Build } from "@stencil/core";
import { dehydrate, hydrate } from "@tanstack/query-core";
import type { DehydratedState, QueryClient } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";

const log = createLogger("query-hydration");

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

	use(() => {
		let hydratedInConnect = false;

		return {
			// Client primary path: runs before any hostWillLoad observer subscription.
			// provideTransferState reads the <script> tag in its own hostConnected (registered
			// earlier in setup()), so ts.get() is already populated when we arrive here.
			hostConnected() {
				if (detectServer()) {
					return;
				}
				const client = clientRef.current;
				if (!client) {
					return;
				}
				const dehydrated = ts.get(DEHYDRATED_KEY);
				if (dehydrated !== undefined) {
					log.log(() => `[${transferKey}] hostConnected  client: hydrating from transferred state`);
					hydrate(client, dehydrated);
					if (Build.isDev) {
						const st = client.getDefaultOptions().queries?.staleTime;
						if (!st) {
							console.warn(
								"[ssv:query] useQueryHydration: client staleTime is 0/undefined — hydrated queries refetch immediately on the client, discarding SSR data. Set a non-zero staleTime (provideQueryClient({ hydrate: true }) defaults it).",
							);
						}
					}
				}
				// Mark as handled even when no data — avoids redundant ts.get() in the fallback.
				hydratedInConnect = true;
			},
			hostWillLoad() {
				if (detectServer()) {
					// Server: register a lazy factory evaluated at toJSON() time (hostDidLoad) —
					// after all hostWillLoad prefetch promises have resolved. This guarantees the
					// serialized snapshot captures fully prefetched cache state.
					const client = clientRef.current;
					if (client) {
						log.log(() => `[${transferKey}] hostWillLoad  server: registering lazy dehydration factory`);
						ts.setLazy(DEHYDRATED_KEY, () => dehydrate(client));
					}
					return;
				}
				// Client fallback: for ancestor-provided clients whose context ref is not yet
				// resolved in hostConnected (bottom-up / hydration init order).
				if (!hydratedInConnect) {
					const client = clientRef.current;
					if (!client) {
						return;
					}
					const dehydrated = ts.get(DEHYDRATED_KEY);
					if (dehydrated !== undefined) {
						log.log(() => `[${transferKey}] hostWillLoad  client fallback: hydrating from transferred state`);
						hydrate(client, dehydrated);
					}
				}
			},
		};
	});
}
