// oxlint-disable @typescript-eslint/no-explicit-any -- mirrors TanStack `useQueries` variadic generic signature; `any` is required for per-element type inference
import { detectServer } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { computed, effect, signal } from "@ssv/stencil-signals";
import type { Signal, WritableSignal } from "@ssv/stencil-signals";
import type { QueryClient, QueriesObserver, QueryObserverResult } from "@tanstack/query-core";

import { pendingQueriesResult, useBaseQueriesObserver } from "../queries-observer";
import type {
	AnyQueriesOptions,
	GetUseQueryResult,
	QueriesResults,
	UseQueriesOptions,
	UseQueryOptionsForUseQueries,
} from "../queries-observer";
import { noObserverRefetch, pendingQueryState } from "../query-observer";
import { createServerQueriesSettle } from "./server-query-settle";
import { createSignalResult } from "./signal-result";
import type { QuerySignalResult } from "./use-query";

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
	[K in keyof T]: ElementToSignalResult<GetUseQueryResult<T[K]>>;
};

// ── API ────────────────────────────────────────────────────────────────────────

/**
 * Overload for a **homogeneous array** of queries (e.g. produced by `.map()`).
 * TypeScript infers the concrete data/error types from the element option type and returns
 * `Signal<QuerySignalResult<TData, TError>[]>` without requiring an explicit annotation
 * at the call site.
 *
 * @example
 * ```ts
 * function $usePostsByIds(getIds: () => number[]) {
 *   return $useQueries(() => ({ queries: getIds().map(id => postQuery(id)) }));
 *   // ↑ inferred as Signal<QuerySignalResult<Post>[]> — no annotation needed
 * }
 * ```
 */
export function $useQueries<TOption extends UseQueryOptionsForUseQueries<any, any, any, any>>(
	getOptions:
		| { queries: readonly TOption[]; combine?: never }
		| (() => { queries: readonly TOption[]; combine?: never }),
	client?: QueryClient | Ref<QueryClient>,
): Signal<ElementToSignalResult<GetUseQueryResult<TOption>>[]>;

/**
 * Overload for a **homogeneous array** of queries with a `combine` function.
 * `results` in the combiner is inferred as `UseQueryResult<TData, TError>[]` — no
 * annotation needed at the call site.
 *
 * @example
 * ```ts
 * readonly #summary = $useQueries(() => ({
 *   queries: ids.map(id => postQuery(id)),
 *   combine: results => ({
 *     total: results.length,
 *     loaded: results.filter(r => r.isSuccess).length,
 *   }),
 * }));
 * ```
 */
export function $useQueries<TOption extends UseQueryOptionsForUseQueries<any, any, any, any>, TCombinedResult>(
	getOptions:
		| {
				queries: readonly TOption[];
				combine: (result: GetUseQueryResult<TOption>[]) => TCombinedResult;
		  }
		| (() => {
				queries: readonly TOption[];
				combine: (result: GetUseQueryResult<TOption>[]) => TCombinedResult;
		  }),
	client?: QueryClient | Ref<QueryClient>,
): Signal<TCombinedResult>;

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
 *   queries: this.ids().map(id => postQuery(id)),
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

	const optsComputed = computed(() => getOpts());

	// ── Combine path ────────────────────────────────────────────────────────────
	if (getOpts().combine !== undefined) {
		const state = signal<TCombinedResult>(pendingQueriesResult<TCombinedResult>(getOpts() as AnyQueriesOptions));
		let disposeOptsEffect: (() => void) | undefined;

		const { reArm, getCurrentResult } = useBaseQueriesObserver<TCombinedResult>(getOptions as never, client, {
			onResult: result => state.set(result),
			onConnect: result => {
				state.set(result);
				if (!detectServer()) {
					const ref = effect([optsComputed], () => applyOptions(), { defer: true });
					disposeOptsEffect = () => ref.dispose();
				}
			},
			onRender: result => state.set(result),
			onDispose: () => {
				state.set(pendingQueriesResult<TCombinedResult>(getOpts() as AnyQueriesOptions));
				disposeOptsEffect?.();
				disposeOptsEffect = undefined;
			},
			onServerRender: ctx =>
				createServerQueriesSettle({
					qc: ctx.qc,
					getOpts: ctx.getOpts as never,
					reArm: ctx.reArm,
					syncResult: ctx.syncResult,
				}),
		});

		const applyOptions = (): void => {
			reArm();
			state.set(getCurrentResult());
		};

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
		const src = signal<QueryObserverResult>({
			...pendingQueryState,
			refetch: noObserverRefetch,
		} as unknown as QueryObserverResult);
		const proxy = createSignalResult(src as never, {
			refetch: async () => obsRef.fn?.()?.getObservers()[i]?.refetch(),
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
		growElements(results.length);
		results.forEach((r, i) => elementSrcs[i].set(r));
		lengthSig.set(results.length);
	};

	// Pre-initialize with pending elements so callers at afterConnect see the correct length.
	const initialCount = getOpts().queries.length;
	growElements(initialCount);
	lengthSig.set(initialCount);

	const syncResults = (results: QueriesResults<T>): void => syncElements(results as QueryObserverResult[]);

	let disposeOptsEffect: (() => void) | undefined;

	const { getObserver, reArm, getCurrentResult } = useBaseQueriesObserver<QueriesResults<T>>(
		getOptions as never,
		client,
		{
			onResult: syncResults,
			onConnect: results => {
				syncResults(results);
				if (!detectServer()) {
					const ref = effect([optsComputed], () => applyOptions(), { defer: true });
					disposeOptsEffect = () => ref.dispose();
				}
			},
			onRender: syncResults,
			onDispose: () => {
				syncElements(pendingQueriesResult<QueriesResults<T>>(getOpts() as AnyQueriesOptions) as QueryObserverResult[]);
				disposeOptsEffect?.();
				disposeOptsEffect = undefined;
			},
			onServerRender: ctx =>
				createServerQueriesSettle({
					qc: ctx.qc,
					getOpts: ctx.getOpts as never,
					reArm: ctx.reArm,
					syncResult: ctx.syncResult,
				}),
		},
	);
	obsRef.fn = getObserver;

	const applyOptions = (): void => {
		reArm();
		syncResults(getCurrentResult());
	};

	return computed(() => elementProxies.slice(0, lengthSig())) as unknown as Signal<TCombinedResult>;
}
