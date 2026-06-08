import { createRef } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";

import { noObserverRefetch, pendingQueryState, useBaseQueryObserver } from "./query-observer";
import type {
	DefinedInitialDataOptions,
	DefinedUseQueryResult,
	UseQueryOptions,
	UseQueryResult,
} from "./query-observer";

/**
 * Subscribes to a query and schedules a re-render whenever the result changes.
 *
 * Returns the full {@link QueryObserverResult} — every field react-query exposes
 * (`isLoading`, `isRefetching`, `isFetched`, `failureCount`, `dataUpdatedAt`, etc.) is available.
 *
 * Pass a **getter function** for reactive options (e.g. when `queryKey` depends on a `@Prop`).
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * When `initialData` is always defined, the return type narrows to {@link DefinedUseQueryResult}
 * (`data: TData`, never `undefined`).
 *
 * @example
 * ```ts
 * readonly #posts = useQuery(() => ({
 *   queryKey: ['posts'],
 *   queryFn: fetchPosts,
 * }));
 *
 * render() {
 *   const { data, isPending, isError } = this.#posts();
 * }
 * ```
 *
 * @example
 * ```ts
 * // Reactive options — re-evaluated each render
 * readonly #post = useQuery(() => ({
 *   queryKey: ['post', this.postId],
 *   queryFn: () => fetchPost(this.postId),
 *   enabled: !!this.postId,
 * }));
 * ```
 */
export function useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): Ref<DefinedUseQueryResult<NoInfer<TData>, TError>>;

export function useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): Ref<UseQueryResult<NoInfer<TData>, TError>>;

export function useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): Ref<QueryObserverResult<TData, TError>> {
	// `onRender: () => handle.reArm()` gives the classic hook its pull-based reactivity: each render
	// re-applies the (possibly changed) options. `handle` is referenced lazily — it is assigned by
	// the time `hostWillRender` first fires. Signal hooks omit `onRender` (they react via an effect).
	const handle = useBaseQueryObserver<TQueryFnData, TError, TData, TQueryKey>(getOptions, client, {
		onResult: (_result, requestUpdate) => requestUpdate(),
		onRender: () => handle.reArm(),
	});
	const { getObserver } = handle;

	return createRef(
		() =>
			(getObserver()?.getCurrentResult() ?? {
				...pendingQueryState,
				refetch: noObserverRefetch,
			}) as QueryObserverResult<TData, TError>,
	);
}
