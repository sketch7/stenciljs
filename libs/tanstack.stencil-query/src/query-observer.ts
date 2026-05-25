import { use, useLoadEffect } from "@ssv/stencil.core";
import { QueryObserver, notifyManager } from "@tanstack/query-core";
import type { QueryClient, QueryKey, QueryObserverResult, RefetchOptions } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseQueryOptions } from "./types";

/** Base query state shared by both hooks as the not-yet-connected value. Excludes `refetch` (an action). */
export const pendingQueryState = {
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
};

/** Rejection used by `refetch` before the observer is connected to the host. */
export const noObserverRefetch = (): Promise<never> =>
	Promise.reject(new Error("[ssv:query] Cannot refetch — observer not yet connected."));

/** Result-surfacing hooks invoked by {@link useBaseQueryObserver} at the appropriate lifecycle points. */
export type QueryObserverHandlers<TData, TError> = {
	/** Fires on every observer notification (subscription callback). */
	onResult: (result: QueryObserverResult<TData, TError>, requestUpdate: () => void) => void;
	/** Fires once right after the observer connects — eager read of already-cached data. */
	onConnect?: (result: QueryObserverResult<TData, TError>) => void;
	/** Fires in `hostWillRender` after `setOptions` — SSR/hydration sync before paint. */
	onRender?: (result: QueryObserverResult<TData, TError>) => void;
	/** Fires on host disconnect — the signals hook resets its source signal to pending. */
	onDispose?: () => void;
};

/** Observer accessor + `refetch` action shared by `useQuery` and `$useQuery`. */
export type QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	refetch: QueryObserverResult<TData, TError>["refetch"];
	getObserver: () => QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
};

/**
 * Shared observer lifecycle for the classic and signals query hooks.
 *
 * Owns option normalization, client resolution, the `QueryObserver` subscription, and the
 * `hostWillRender → setOptions` step. The classic hook only needs `onResult` (lazy `Ref` read +
 * `requestUpdate`); the signals hook additionally uses `onConnect`/`onRender`/`onDispose` to keep
 * its source signal eagerly populated and reset on disconnect.
 */
export function useBaseQueryObserver<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client: QueryClient | undefined,
	handlers: QueryObserverHandlers<TData, TError>,
): QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

	const clientRef = useQueryClient(client);

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;

	const refetch: QueryObserverResult<TData, TError>["refetch"] = (options?: RefetchOptions) =>
		observer?.refetch(options) ?? noObserverRefetch();

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		({ qc, requestUpdate }) => {
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				qc.defaultQueryOptions(getOpts()),
			);

			// Sync immediately in case data is already cached.
			handlers.onConnect?.(observer.getCurrentResult());

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					const r = observer?.getCurrentResult();
					if (r) {
						handlers.onResult(r, requestUpdate);
					}
				}),
			);

			return () => {
				unsubscribe();
				observer?.destroy();
				observer = undefined;
				handlers.onDispose?.();
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
			// Sync latest result before each render — mirrors useQuery's lazy Ref read.
			// Ensures SSR/hydration sees the cached data even if the subscription
			// callback was batched as a microtask and not yet flushed.
			handlers.onRender?.(observer.getCurrentResult());
		},
	}));

	return { refetch, getObserver: () => observer };
}
