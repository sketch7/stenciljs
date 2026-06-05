import type { Ref } from "@ssv/stencil-core";
import type { DefaultError, FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/query-core";

import { usePrefetchLifecycle } from "./prefetch-lifecycle";
import type { PrefetchBlockMode } from "./prefetch-lifecycle";
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
 * Always calls `qc.prefetchQuery` — TanStack deduplicates concurrent requests (returns the
 * in-flight promise for the same key) and resolves immediately for fresh cache entries, so
 * calling it unconditionally is safe. Returns `void` — no state, no subscriptions, no re-renders.
 *
 * The `block` option controls when the host's render is blocked:
 * - `"always"` (default) — blocks on both server and client.
 * - `"server"` — blocks SSR; fire-and-forget on the client.
 * - `false` — never blocks (fire-and-forget on both sides).
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
 * // Server-only block — do not await on the client
 * readonly #_ = usePrefetchQuery(
 *   { queryKey: ['posts'], queryFn: fetchPosts },
 *   this.#qc,
 *   { block: 'server' },
 * );
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
	options?: { block?: PrefetchBlockMode },
): void {
	const clientRef = useQueryClient(client);
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	usePrefetchLifecycle(
		clientRef,
		getOpts as unknown as () => FetchQueryOptions | undefined | null | false,
		options?.block ?? "always",
	);
}

export type { PrefetchBlockMode };
