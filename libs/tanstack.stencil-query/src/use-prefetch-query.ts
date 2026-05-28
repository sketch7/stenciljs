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
 * during SSR before rendering. Always calls `qc.prefetchQuery` — TanStack deduplicates
 * concurrent requests (returns the in-flight promise for the same key) and resolves
 * immediately for fresh cache entries, so calling it unconditionally is safe.
 * Returns `void` — no state, no subscriptions, no re-renders.
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
			// Always call prefetchQuery — TanStack deduplicates concurrent requests (if another
			// component already started the same fetch, this returns the same in-flight promise)
			// and resolves immediately for fresh cache entries. Guarding with getQueryState()
			// would skip awaiting when a sibling's prefetch is pending, causing render() to run
			// before data arrives.
			return qc.prefetchQuery(opts);
		},
	}));
}
