import { detectServer } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { computed, effect } from "@ssv/stencil-signals";
import type { DefaultError, FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/query-core";

import { useServerPrefetch } from "../prefetch-lifecycle";
import type { PrefetchBlockMode } from "../prefetch-lifecycle";
import { useQueryClient } from "../query-client-context";
import type { UsePrefetchQueryOptions } from "../use-prefetch-query";

export type { PrefetchBlockMode };

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
 * The `block` option controls server-side behavior (client always uses the reactive effect):
 * - `"server"` (default) — server prefetch is registered as a pending task (awaited before render).
 * - `false` — no server prefetch; only the reactive client effect runs.
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
	options?: { block?: Extract<PrefetchBlockMode, "server" | false> },
): void {
	const clientRef = useQueryClient(client);
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	const block = options?.block ?? "server";

	// Server: register a pending task (awaited before render) when block is "server".
	if (block === "server") {
		useServerPrefetch(clientRef, getOpts as unknown as () => FetchQueryOptions);
	}

	// Client: reactive computed + effect — re-fires whenever signal reads inside the getter change.
	// Gated with detectServer() so the effect does not double-prefetch on the server when
	// useServerPrefetch has already registered a pending task for the same options.
	const optsComputed = computed(() => getOpts());

	effect([optsComputed], ([opts]) => {
		// Server path is handled by useServerPrefetch above; skip to avoid duplicate fetches.
		if (detectServer()) {
			return;
		}
		if (!opts) {
			return;
		}
		const qc = clientRef.current;
		if (!qc) {
			return;
		}
		if (!qc.getQueryState(opts.queryKey)) {
			void qc.prefetchQuery(opts);
		}
	});
}
