import { createRef, use, useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { QueriesObserver, notifyManager } from "@tanstack/query-core";
import type {
	DefaultError,
	QueryClient,
	QueryKey,
	QueryObserverOptions,
	QueryObserverResult,
} from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseQueryOptions } from "./query-observer";

// ── useQueries types ──────────────────────────────────────────────────────────

/** A single entry in the queries array passed to {@link useQueries}. */
export type UseQueriesQueryOption<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

/** Return type of {@link useQueries} — an array of {@link QueryObserverResult}, one per query option. */
export type UseQueriesResult<TData = unknown, TError = DefaultError> = QueryObserverResult<TData, TError>[];

/** {@link Ref} alias for the result of {@link useQueries}. */
export type UseQueriesRef<TData = unknown, TError = DefaultError> = Ref<UseQueriesResult<TData, TError>>;

// ── useQueries ────────────────────────────────────────────────────────────────

/**
 * Subscribes to multiple queries simultaneously and schedules a re-render when any result changes.
 *
 * Returns a {@link Ref} of an array of {@link QueryObserverResult}, one entry per element in
 * `getQueries`. The order of results matches the order of query options passed in.
 *
 * Pass a **getter function** for reactive options (e.g. when query keys depend on props).
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * @example
 * ```ts
 * readonly #results = useQueries([
 *   { queryKey: ['posts'], queryFn: fetchPosts },
 *   { queryKey: ['users'], queryFn: fetchUsers },
 * ]);
 *
 * render() {
 *   const [posts, users] = this.#results();
 * }
 * ```
 *
 * @example
 * ```ts
 * // Reactive options — re-evaluated each render
 * readonly #results = useQueries(() => [
 *   { queryKey: ['post', this.postId], queryFn: () => fetchPost(this.postId) },
 *   { queryKey: ['user', this.userId], queryFn: () => fetchUser(this.userId) },
 * ]);
 * ```
 */
export function useQueries<TData = unknown, TError = DefaultError>(
	getQueries: UseQueryOptions[] | (() => UseQueryOptions[]),
	client?: QueryClient | Ref<QueryClient>,
): UseQueriesRef<TData, TError> {
	const getOpts = typeof getQueries === "function" ? getQueries : () => getQueries;
	const clientRef = useQueryClient(client);
	let observer: QueriesObserver | undefined;

	const resolveQueries = (qc: QueryClient): QueryObserverOptions[] =>
		getOpts().map(opts => qc.defaultQueryOptions(opts as QueryObserverOptions));

	useLoadEffect(
		({ qc, requestUpdate }) => {
			observer = new QueriesObserver(qc, resolveQueries(qc));

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					requestUpdate();
				}),
			);

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
			observer.setQueries(resolveQueries(qc));
		},
	}));

	return createRef(() => (observer?.getCurrentResult() as QueryObserverResult<TData, TError>[]) ?? []);
}
