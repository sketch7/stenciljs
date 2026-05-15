import { use } from "@ssv/stencil.core";
import { QueryObserver, notifyManager } from "@tanstack/query-core";
import type {
	DefaultError,
	QueryClient,
	QueryKey,
	QueryObserverOptions,
	QueryObserverResult,
	RefetchOptions,
} from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseQueryResult } from "./types";

/**
 * Subscribes to a query and schedules a re-render whenever the result changes.
 *
 * Pass a getter function for reactive options (e.g., when `queryKey` depends on a `@Prop`).
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * @example
 * ```ts
 * readonly #posts = useQuery(() => ({
 *   queryKey: ['posts'],
 *   queryFn: fetchPosts,
 * }));
 *
 * render() {
 *   const { data, isPending, isError } = this.#posts;
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
		| QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>
		| (() => QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>),
	client?: QueryClient,
): UseQueryResult<TData, TError> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>;

	const clientRef = useQueryClient(client);

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
	let result: QueryObserverResult<TData, TError> | null = null;
	let unsubscribe: (() => void) | undefined;

	const queryRef: UseQueryResult<TData, TError> = {
		get data() {
			return result?.data;
		},
		get isPending() {
			return result?.isPending ?? true;
		},
		get isSuccess() {
			return result?.isSuccess ?? false;
		},
		get isError() {
			return result?.isError ?? false;
		},
		get error() {
			return result?.error ?? null;
		},
		get isFetching() {
			return result?.isFetching ?? false;
		},
		get status() {
			return result?.status ?? "pending";
		},
		get fetchStatus() {
			return result?.fetchStatus ?? "idle";
		},
		refetch(options?: RefetchOptions) {
			return (
				observer?.refetch(options) ??
				Promise.reject(new Error("[ssv:query] Cannot refetch — no QueryClient is available."))
			);
		},
	};

	use(host => ({
		hostConnected() {
			const qc = clientRef.current;
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				qc.defaultQueryOptions(getOpts()),
			);
			result = observer.getCurrentResult();

			unsubscribe = observer.subscribe(
				notifyManager.batchCalls((nextResult: QueryObserverResult<TData, TError>) => {
					result = nextResult;
					host.requestUpdate();
				}),
			);
		},
		hostWillRender() {
			if (!observer) {
				return;
			}
			const qc = clientRef.current;
			observer.setOptions(qc.defaultQueryOptions(getOpts()));
			result = observer.getCurrentResult();
		},
		hostDisconnected() {
			unsubscribe?.();
			unsubscribe = undefined;
			observer?.destroy();
			observer = undefined;
			result = null;
		},
	}));

	return queryRef;
}
