import type { DataTag, DefaultError, OmitKeyof, QueryKey, SkipToken } from "@tanstack/query-core";

import type { DefinedInitialDataOptions, UndefinedInitialDataOptions, UseQueryOptions } from "./types";

/**
 * {@link UseQueryOptions} variant that explicitly excludes {@link SkipToken} from `queryFn`.
 *
 * Use this when you want to assert the query will always fetch — passing `skipToken` will be a type error.
 */
export type DefinedQueryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = OmitKeyof<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
	queryFn?: Exclude<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>["queryFn"], SkipToken | undefined>;
};

/**
 * Creates a type-safe, reusable query options object.
 *
 * The return type carries a `DataTag` on `queryKey` so the data type flows through
 * `getQueryData` / `setQueryData` / `invalidateQueries` without manual casting.
 *
 * Provides three overloads:
 * - `DefinedInitialDataOptions` — `data` is always `TData`, never `undefined`.
 * - `DefinedQueryOptions` — asserts `queryFn` is never `skipToken`.
 * - `UndefinedInitialDataOptions` — default; `data` may be `undefined`.
 *
 * @example
 * ```ts
 * export const postKeys = {
 *   all: ['posts'] as const,
 *   list: () => [...postKeys.all, 'list'] as const,
 *   detail: (id: number) => [...postKeys.all, 'detail', id] as const,
 * };
 *
 * export const postQueries = {
 *   list: () => queryOptions({
 *     queryKey: postKeys.list(),
 *     queryFn: fetchPosts,
 *     staleTime: 5 * 60 * 1000,
 *   }),
 *   detail: (id: number) => queryOptions({
 *     queryKey: postKeys.detail(id),
 *     queryFn: () => fetchPost(id),
 *   }),
 * };
 *
 * // usage in component:
 * readonly #posts = useQuery(postQueries.list());
 * readonly _prefetch = usePrefetchQuery(postQueries.detail(this.postId));
 * ```
 */
export function queryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	options: DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
	queryKey: DataTag<TQueryKey, TQueryFnData, TError>;
};

export function queryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	options: DefinedQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): DefinedQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
	queryKey: DataTag<TQueryKey, TQueryFnData, TError>;
};

export function queryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	options: UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
	queryKey: DataTag<TQueryKey, TQueryFnData, TError>;
};

export function queryOptions(options: unknown): unknown {
	return options;
}
