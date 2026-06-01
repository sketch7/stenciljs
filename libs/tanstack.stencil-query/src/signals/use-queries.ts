import { use, useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { signal } from "@ssv/stencil-signals";
import type { Signal } from "@ssv/stencil-signals";
import { QueriesObserver, notifyManager } from "@tanstack/query-core";
import type { DefaultError, QueryClient, QueryObserverOptions, QueryObserverResult } from "@tanstack/query-core";

import { useQueryClient } from "../query-client-context";
import type { UseQueryOptions } from "../query-observer";

// ── $useQueries types ─────────────────────────────────────────────────────────

/** Return type of {@link $useQueries} — a signal wrapping an array of {@link QueryObserverResult}. */
export type UseQueriesSignalResult<TData = unknown, TError = DefaultError> = Signal<
	QueryObserverResult<TData, TError>[]
>;

// ── $useQueries ───────────────────────────────────────────────────────────────

/**
 * Signal-based variant of {@link useQueries}.
 *
 * Subscribes to multiple queries simultaneously and exposes the results as a single
 * {@link Signal} wrapping an array of {@link QueryObserverResult}. The signal updates
 * (and triggers reactive re-renders) whenever any individual query result changes.
 *
 * Requires `useSignalWatcher()` to be active on the host.
 *
 * Pass a **getter function** for reactive options (e.g. when query keys depend on signals).
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * @example
 * ```ts
 * readonly #results = $useQueries([
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
 * // Fine-grained derived signal
 * readonly #isAnyPending = computed(() => this.#results().some(r => r.isPending));
 * ```
 */
export function $useQueries<TData = unknown, TError = DefaultError>(
	getQueries: UseQueryOptions[] | (() => UseQueryOptions[]),
	client?: QueryClient | Ref<QueryClient>,
): UseQueriesSignalResult<TData, TError> {
	const getOpts = typeof getQueries === "function" ? getQueries : () => getQueries;
	const clientRef = useQueryClient(client);
	const state = signal<QueryObserverResult<TData, TError>[]>([]);
	let observer: QueriesObserver | undefined;

	const resolveQueries = (qc: QueryClient): QueryObserverOptions[] =>
		getOpts().map(opts => qc.defaultQueryOptions(opts as QueryObserverOptions));

	useLoadEffect(
		({ qc }) => {
			observer = new QueriesObserver(qc, resolveQueries(qc));

			// Sync immediately for any already-cached data.
			state.set(observer.getCurrentResult() as QueryObserverResult<TData, TError>[]);

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					if (observer) {
						state.set(observer.getCurrentResult() as QueryObserverResult<TData, TError>[]);
					}
				}),
			);

			return () => {
				unsubscribe();
				observer?.destroy();
				observer = undefined;
				state.set([]);
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
			state.set(observer.getCurrentResult() as QueryObserverResult<TData, TError>[]);
		},
	}));

	return state;
}
