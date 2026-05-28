import { use } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { computed, createWatcher, scheduler } from "@ssv/stencil-signals";
import type { Signal } from "@ssv/stencil-signals";
import type { DefaultError, QueryClient, QueryKey } from "@tanstack/query-core";

import { useQueryClient } from "../query-client-context";
import type { UsePrefetchQueryOptions } from "../types";

/**
 * Reactive prefetch — seeds the cache whenever signal-based options change.
 *
 * Wraps the options getter in a `computed` and watches it with a low-level signal watcher.
 * When any signal read inside the getter changes, the prefetch re-fires automatically
 * (deferred to the next microtask batch, same as TC39 effect scheduling).
 * Disposes the watcher on `hostDisconnected`. Does NOT require `useSignalWatcher()`.
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
		| (() => UsePrefetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient | Ref<QueryClient>,
): void {
	const clientRef = useQueryClient(client);
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	// Wrap options in a computed — auto-tracks any signals read inside getOpts.
	// When a tracked signal changes, optsComputed becomes dirty and the watcher notifies.
	const optsComputed = computed(() => getOpts());

	let watcher: ReturnType<typeof createWatcher> | undefined;

	use({
		hostConnected() {
			const doRun = () => {
				const opts = optsComputed(); // re-evaluates if dirty; tracks dependencies
				const qc = clientRef();
				if (!qc.getQueryState(opts.queryKey)) {
					qc.prefetchQuery(opts);
				}
			};

			doRun(); // initial prefetch (safe — outside TC39 notification phase)

			// TC39 constraint: cannot read signals in the notify callback (notification phase).
			// Defer with scheduler.schedule — same coalescing microtask batcher as createEffect.
			watcher = createWatcher(() => {
				scheduler.schedule(() => {
					if (!watcher) {
						return;
					} // host disconnected — skip
					doRun();
				});
			});
			watcher.watch(optsComputed as Signal<unknown>);
		},
		hostDisconnected() {
			watcher?.dispose();
			watcher = undefined;
		},
	});
}
