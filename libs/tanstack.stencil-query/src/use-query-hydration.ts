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
 * Reads dehydrated state from the nearest `provideTransferState` scope and hydrates the client on connect.
 * On the server, registers a lazy factory to serialize the client cache into the transfer state.
 *
 * Call after `provideTransferState` and `provideQueryClient` so all context providers are registered first.
 *
 * @example
 * ```ts
 * // Basic — hydrates the QueryClient from context:
 * readonly #ts = provideTransferState("my-scope");
 * readonly #qc = provideQueryClient();
 * readonly _ = this.setup(() => useQueryHydration());
 * ```
 *
 * @example
 * ```ts
 * // Multiple QueryClients within the same TransferState scope:
 * readonly #ts = provideTransferState("my-scope");
 * readonly #postsClient = provideQueryClient();
 * readonly #usersClient = new QueryClient();
 * readonly _ = this.setup(() => {
 *   useQueryHydration({ key: "posts" });
 *   useQueryHydration({ client: this.#usersClient, key: "users" });
 * });
 * ```
 */
export function useQueryHydration(options?: UseQueryHydrationOptions): void {
	const transferKey = options?.key ? `__tsq-${options.key}` : "__tsq";
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
