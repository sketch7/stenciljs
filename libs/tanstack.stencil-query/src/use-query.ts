import { use, createRef } from "@ssv/stencil.core";
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
	let unsubscribe: (() => void) | undefined;

	use(host => ({
		hostConnected() {
			const qc = clientRef.current;
			// Create the observer eagerly so getCurrentResult() works for synchronous reads,
			// but do NOT subscribe yet — subscription starts in hostWillRender, which runs
			// after ALL hostWillLoad hooks complete (including any prefetchQuery calls).
			// This guarantees the observer finds fresh cache data and skips the network fetch.
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				qc.defaultQueryOptions(getOpts()),
			);
		},
		hostWillRender() {
			if (!observer) {
				return;
			}
			const qc = clientRef.current;
			observer.setOptions(qc.defaultQueryOptions(getOpts()));
			// Subscribe on the first render (after all hostWillLoad hooks complete).
			// On subsequent renders, the subscription is already active — just refresh result.
			if (!unsubscribe) {
				unsubscribe = observer.subscribe(
					notifyManager.batchCalls(() => {
						host.requestUpdate();
					}),
				);
			}
		},
		hostDisconnected() {
			unsubscribe?.();
			unsubscribe = undefined;
			observer?.destroy();
			observer = undefined;
		},
	}));

	return createRef(
		() => (observer?.getCurrentResult() ?? pendingState) as unknown as QueryObserverResult<TData, TError>,
	);
}
