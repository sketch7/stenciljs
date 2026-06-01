// oxlint-disable @typescript-eslint/no-explicit-any -- mirrors TanStack `useQueries` variadic generic signature; `any` is required for per-element type inference
import type { Ref } from "@ssv/stencil-core";
import { computed, signal } from "@ssv/stencil-signals";
import type { Signal, WritableSignal } from "@ssv/stencil-signals";
import type { QueryClient, QueriesObserver, QueryObserverResult } from "@tanstack/query-core";

import { pendingQueriesResult, useBaseQueriesObserver } from "../queries-observer";
import type { QueriesResults, UseQueriesOptions } from "../queries-observer";
import { noObserverRefetch, pendingQueryState } from "../query-observer";
import { createSignalResult } from "./signal-result";
import type { QuerySignalResult } from "./use-query";

// ── Module helpers ─────────────────────────────────────────────────────────────

/** Returns a fresh pending-state element result (no observer attached). */
const pendingElement = (): QueryObserverResult =>
	({ ...pendingQueryState, refetch: noObserverRefetch }) as unknown as QueryObserverResult;

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Maps a single raw `QueryObserverResult` to the signals proxy type returned by
 * the no-combine path of {@link $useQueries}.
 * @internal
 */
type ElementToSignalResult<R> =
	R extends QueryObserverResult<infer TData, infer TError> ? QuerySignalResult<TData, TError> : never;

/**
 * Return type of {@link $useQueries} when no `combine` function is provided.
 * Each element is a per-field signal proxy matching {@link QuerySignalResult}.
 *
 * @example
 * ```ts
 * readonly #posts: QueriesSignalResults<[PostOpts, PostOpts]> = $useQueries(...);
 * // Usage:
 * this.#posts()[0].isPending()   // Signal<boolean>
 * this.#posts()[0].data()        // Signal<Post | undefined>
 * this.#posts()[0].refetch()     // plain refetch fn
 * ```
 */
export type QueriesSignalResults<T extends any[]> = {
	[K in keyof QueriesResults<T>]: ElementToSignalResult<QueriesResults<T>[K]>;
};

// ── API ────────────────────────────────────────────────────────────────────────

/**
 * Subscribes to a list of queries in parallel and exposes each result as a per-field signal proxy.
 *
 * Without `combine`, each element in the returned signal array is a {@link QuerySignalResult} —
 * every field is a callable signal (`result.isPending()`, `result.data()`, …) so only the
 * component that reads a changed field re-renders. Requires `useSignalWatcher()` to be active.
 *
 * Pass a **getter function** for reactive options (e.g. when the query list depends on a signal).
 *
 * @example
 * ```ts
 * readonly #posts = $useQueries(() => ({
 *   queries: this.ids().map(id => ({ queryKey: ['post', id], queryFn: () => fetchPost(id) })),
 * }));
 *
 * render() {
 *   return this.#posts().map(r =>
 *     r.isPending() ? <span>Loading…</span> : <span>{r.data()?.title}</span>
 *   );
 * }
 * ```
 */
export function $useQueries<T extends any[]>(
	getOptions: UseQueriesOptions<T> | (() => UseQueriesOptions<T>),
	client?: QueryClient | Ref<QueryClient>,
): Signal<QueriesSignalResults<T>>;

/**
 * Subscribes to a list of queries in parallel and derives a single value via `combine`.
 *
 * With `combine`, the returned signal holds `TCombinedResult` — the plain value produced by the
 * combiner. Reads in `render()` or `computed()` are tracked. Requires `useSignalWatcher()` to be active.
 *
 * @example
 * ```ts
 * readonly #summary = $useQueries({
 *   queries: [a, b, c],
 *   combine: results => ({
 *     total: results.length,
 *     loaded: results.filter(r => r.isSuccess).length,
 *   }),
 * });
 *
 * render() {
 *   const { loaded, total } = this.#summary();
 * }
 * ```
 */
export function $useQueries<T extends any[], TCombinedResult>(
	getOptions: UseQueriesOptions<T, TCombinedResult> | (() => UseQueriesOptions<T, TCombinedResult>),
	client?: QueryClient | Ref<QueryClient>,
): Signal<TCombinedResult>;

export function $useQueries<T extends any[], TCombinedResult = QueriesResults<T>>(
	getOptions: UseQueriesOptions<T, TCombinedResult> | (() => UseQueriesOptions<T, TCombinedResult>),
	client?: QueryClient | Ref<QueryClient>,
): Signal<QueriesSignalResults<T>> | Signal<TCombinedResult> {
	const getOpts = (typeof getOptions === "function" ? getOptions : () => getOptions) as () => UseQueriesOptions<
		T,
		TCombinedResult
	>;

	// ── Combine path ────────────────────────────────────────────────────────────
	if (getOpts().combine !== undefined) {
		const state = signal<TCombinedResult>(pendingQueriesResult<TCombinedResult>(getOpts()));
		useBaseQueriesObserver<TCombinedResult>(getOptions as never, client, {
			onResult: result => state.set(result),
			onConnect: result => state.set(result),
			onRender: result => state.set(result),
			onDispose: () => state.set(pendingQueriesResult<TCombinedResult>(getOpts())),
		});
		return state.asReadonly();
	}

	// ── No-combine path: per-element signal proxies ─────────────────────────────
	// Stable per-element signals and proxies — grown on demand, never shrunk.
	const elementSrcs: WritableSignal<QueryObserverResult>[] = [];
	const elementProxies: QuerySignalResult[] = [];
	// Tracks the current array length so the outer computed re-evaluates on size change.
	const lengthSig = signal(0);

	// Mutable wrapper assigned synchronously after useBaseQueriesObserver is called.
	// Closures that call obsRef.fn() only fire at hostWillLoad or later, so the value
	// is always present by the time they run.
	const obsRef: { fn: (() => QueriesObserver<QueriesResults<T>> | undefined) | undefined } = { fn: undefined };

	/** Creates and registers a single pending element + proxy at position `elementSrcs.length`. */
	const addElement = (): void => {
		const i = elementSrcs.length;
		const src = signal<QueryObserverResult>(pendingElement());
		const proxy = createSignalResult(src as never, {
			refetch: () => obsRef.fn?.()?.getObservers()[i]?.refetch(),
		}) as unknown as QuerySignalResult;
		elementSrcs.push(src);
		elementProxies.push(proxy);
	};

	const growElements = (count: number): void => {
		while (elementSrcs.length < count) {
			addElement();
		}
	};

	const syncElements = (results: QueryObserverResult[]): void => {
		// Grow element signals and proxies for any new queries.
		growElements(results.length);
		results.forEach((r, i) => elementSrcs[i].set(r));
		lengthSig.set(results.length);
	};

	// Pre-initialize with pending elements so callers at afterConnect see the correct length.
	growElements(getOpts().queries.length);
	lengthSig.set(getOpts().queries.length);

	const handle = useBaseQueriesObserver<QueriesResults<T>>(getOptions as never, client, {
		onResult: results => syncElements(results as QueryObserverResult[]),
		onConnect: results => syncElements(results as QueryObserverResult[]),
		onRender: results => syncElements(results as QueryObserverResult[]),
		onDispose: () => syncElements(pendingQueriesResult<QueriesResults<T>>(getOpts()) as QueryObserverResult[]),
	});
	obsRef.fn = handle.getObserver;

	return computed(() => elementProxies.slice(0, lengthSig())) as unknown as Signal<QueriesSignalResults<T>>;
}
