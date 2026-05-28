import type { Ref } from "@ssv/stencil-core";
import { computed, effect } from "@ssv/stencil-signals";
import type { DefaultError, QueryClient, QueryKey } from "@tanstack/query-core";

import { useQueryClient } from "../query-client-context";
import type { UsePrefetchQueryOptions } from "../types";

/**
 * Reactive prefetch — seeds the cache whenever signal-based options change.
 *
 * Wraps the options getter in a `computed` and re-runs via `effect([computed])`.
 * When any signal read inside the getter changes, the effect re-fires automatically
 * (deferred to the next microtask batch by the active signals adapter).
 * The host must register `useSignalWatcher()` before calling this utility.
 * Disposal is host-bound automatically when used inside a component.
 * Skips the fetch if any cache entry already exists for `queryKey`.
 *
 * @example
 * ```ts
 * // Hover-to-prefetch: re-fires whenever #hoveredId signal changes
 * readonly #_ = $usePrefetchQuery(() => ({
 *   queryKey: ['post', this.#hoveredId()],
 *   queryFn: () => fetchPost(this.#hoveredId()),
 * }), this.#qc);
 * ```
 *
 * @example
 * ```ts
 * // Reusable outside a component
 * function prefetchUser(client: QueryClient | Ref<QueryClient>, idSignal: Signal<string>) {
 *   $usePrefetchQuery(() => ({
 *     queryKey: ['user', idSignal()],
 *     queryFn: () => fetchUser(idSignal()),
 *   }), client);
 * }
 * ```
 */
export function $usePrefetchQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UsePrefetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UsePrefetchQueryOptions<TQueryFnData, TError, TData, TQueryKey> | undefined | null | false),
	client?: QueryClient | Ref<QueryClient>,
): void {
	const clientRef = useQueryClient(client);
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	const optsComputed = computed(() => getOpts());

	effect([optsComputed], ([opts]) => {
		if (!opts) {
			return;
		}
		const qc = clientRef.current;
		if (!qc) {
			return;
		}
		if (!qc.getQueryState(opts.queryKey)) {
			qc.prefetchQuery(opts);
		}
	});
}
