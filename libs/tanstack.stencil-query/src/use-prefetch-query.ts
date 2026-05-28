import { use } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import type { DefaultError, FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";

// ── usePrefetchQuery types ────────────────────────────────────────────────────

/**
 * Options for {@link usePrefetchQuery} and {@link $usePrefetchQuery}.
 * A subset of `UseQueryOptions` — only fields relevant to fetching (`queryKey`, `queryFn`,
 * `staleTime`, `gcTime`). Observer-specific fields (`enabled`, `refetchInterval`, etc.) are excluded.
 */
export type UsePrefetchQueryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

/**
 * Seeds the QueryClient cache on `hostWillLoad`.
 *
 * Returns the `Promise` from `prefetchQuery` out of `hostWillLoad` so Stencil awaits it
 * during SSR before rendering. Mirrors TanStack React's `usePrefetchQuery`: skips the fetch
 * if any cache entry already exists for `queryKey`. Returns `void` — no state, no subscriptions, no re-renders.
 *
 * Pass a **getter function** for options computed from props or other state.
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * @example
 * ```ts
 * // Field initializer — seeds cache before children connect
 * readonly #_ = usePrefetchQuery({ queryKey: ['posts'], queryFn: fetchPosts }, this.#qc);
 * ```
 *
 * @example
 * ```ts
 * // Reusable outside a component
 * function prefetchPosts(client: QueryClient | Ref<QueryClient>) {
 *   usePrefetchQuery({ queryKey: ['posts'], queryFn: fetchPosts }, client);
 * }
 * ```
 */
export function usePrefetchQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UsePrefetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UsePrefetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): void {
	const clientRef = useQueryClient(client);
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	use(() => ({
		hostWillLoad(): Promise<void> | void {
			const qc = clientRef.current;
			if (!qc) {
				return;
			}
			const opts = getOpts();
			if (!qc.getQueryState(opts.queryKey)) {
				return qc.prefetchQuery(opts);
			}
		},
	}));
}
