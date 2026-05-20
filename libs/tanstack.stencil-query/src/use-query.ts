import { use, createRef, useLoadEffect } from "@ssv/stencil.core";
import type { Ref } from "@ssv/stencil.core";
import { QueryObserver, notifyManager } from "@tanstack/query-core";
import type { DefaultError, NoInfer, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { DefinedInitialDataOptions, DefinedUseQueryResult, UseQueryOptions, UseQueryResult } from "./types";

/** State returned while the observer is not yet connected to the host. */
const pendingState = {
	data: undefined,
	isPending: true,
	isLoading: true,
	isInitialLoading: true,
	isSuccess: false,
	isError: false,
	isFetching: false,
	isRefetching: false,
	isFetched: false,
	isFetchedAfterMount: false,
	isPlaceholderData: false,
	isLoadingError: false,
	isRefetchError: false,
	isStale: false,
	status: "pending" as const,
	fetchStatus: "idle" as const,
	error: null,
	failureReason: null,
	failureCount: 0,
	dataUpdatedAt: 0,
	errorUpdatedAt: 0,
	errorUpdateCount: 0,
	refetch: (): Promise<never> => Promise.reject(new Error("[ssv:query] Cannot refetch — observer not yet connected.")),
};

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
	client?: QueryClient,
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
	client?: QueryClient,
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
	client?: QueryClient,
): Ref<QueryObserverResult<TData, TError>> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

	const clientRef = useQueryClient(client);

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		({ qc, requestUpdate }) => {
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				qc.defaultQueryOptions(getOpts()),
			);
			const unsubscribe = observer.subscribe(notifyManager.batchCalls(() => requestUpdate()));
			return () => {
				unsubscribe();
				observer?.destroy();
				observer = undefined;
			};
		},
		{ qc: clientRef },
	);

	use(() => ({
		hostWillRender() {
			const qc = clientRef.current;
			if (!observer || !qc) {
				return;
			}
			// TODO(perf): skip setOptions when options is static (not a function) — mirrors Lit BaseController.onHostUpdate()
			observer.setOptions(qc.defaultQueryOptions(getOpts()));
		},
	}));

	return createRef(
		() => (observer?.getCurrentResult() ?? pendingState) as unknown as QueryObserverResult<TData, TError>,
	);
}
