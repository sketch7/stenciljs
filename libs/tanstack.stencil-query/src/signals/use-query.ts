import type { Ref } from "@ssv/stencil-core";
import { signal } from "@ssv/stencil-signals";
import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";

import { pendingQueryState, useBaseQueryObserver } from "../query-observer";
import type { UseQueryOptions } from "../query-observer";
import { createSignalResult } from "./signal-result";
import type { SignalFields } from "./signal-result";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueryStateData<TData, TError> = Omit<QueryObserverResult<TData, TError>, "refetch">;

/** Return type of {@link $useQuery} — per-field signals with a plain `refetch`. */
export type QuerySignalResult<TData = unknown, TError = DefaultError> = SignalFields<QueryStateData<TData, TError>> & {
	refetch: QueryObserverResult<TData, TError>["refetch"];
};

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Subscribes to a query and exposes the result as per-field signals.
 *
 * Each field (`isPending`, `data`, `isError`, …) is a signal — reads inside `render()` or
 * `computed()` are tracked individually. Requires `useSignalWatcher()` to be active.
 *
 * Pass a **getter function** for reactive options (e.g. when `queryKey` depends on a signal).
 *
 * @example
 * ```ts
 * readonly #posts = $useQuery(() => ({
 *   queryKey: ['posts'],
 *   queryFn: fetchPosts,
 * }));
 *
 * render() {
 *   const posts = this.#posts.data();
 *   const isPending = this.#posts.isPending();
 * }
 * ```
 *
 * @example
 * ```ts
 * // Reactive options — signal read captured in closure
 * readonly #user = $useQuery(() => {
 *   const userId = this.#userId();
 *   return {
 *     queryKey: ['user', userId] as const,
 *     queryFn: () => fetchUser(userId),
 *   };
 * });
 * ```
 *
 * @example
 * ```ts
 * // Fine-grained derived signal
 * readonly #isLoading = computed(() => this.#user.isPending() || this.#user.isFetching());
 * ```
 */
export function $useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): QuerySignalResult<NoInfer<TData>, TError>;

export function $useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): QuerySignalResult<TData, TError> {
	const state = signal(pendingQueryState as unknown as QueryStateData<TData, TError>);

	const { refetch } = useBaseQueryObserver<TQueryFnData, TError, TData, TQueryKey>(getOptions, client, {
		onResult: result => state.set(result),
		onConnect: result => state.set(result),
		onRender: result => state.set(result),
		onDispose: () => state.set(pendingQueryState as unknown as QueryStateData<TData, TError>),
	});

	return createSignalResult(state, { refetch });
}
