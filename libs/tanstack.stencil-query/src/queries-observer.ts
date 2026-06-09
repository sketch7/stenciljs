// oxlint-disable @typescript-eslint/no-explicit-any -- ported TanStack `useQueries` variadic type machinery relies on `any` in conditional-inference positions; replacing with `unknown` breaks per-element type inference
import { detectServer, use, useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { QueriesObserver, notifyManager } from "@tanstack/query-core";
import type {
	DefaultError,
	OmitKeyof,
	QueriesPlaceholderDataFunction,
	QueryClient,
	QueryFunction,
	QueryKey,
	QueryObserverOptions,
	QueryObserverResult,
	ThrowOnError,
} from "@tanstack/query-core";

import { useIsRestoring } from "./is-restoring";
import { useQueryClient } from "./query-client-context";
import { isQueryKeyHeld, noObserverRefetch, pendingQueryState } from "./query-observer";
import type { DefinedUseQueryResult, UseQueryOptions, UseQueryResult } from "./query-observer";

// ── useQueries variadic types ──────────────────────────────────────────────────
// Ported from @tanstack/react-query's `useQueries` type machinery so each element's
// data/error types are preserved through the queries tuple. See:
// https://github.com/TanStack/query/blob/main/packages/react-query/src/useQueries.ts

/**
 * {@link UseQueryOptions} accepted inside a `queries` array element.
 * `placeholderData` always receives `undefined` here (no previous element data).
 */
export type UseQueryOptionsForUseQueries<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = OmitKeyof<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "placeholderData"> & {
	placeholderData?: TQueryFnData | QueriesPlaceholderDataFunction<TQueryFnData>;
};

// Avoid TS depth-limit error in case of large array literal.
type MAXIMUM_DEPTH = 20;

// Widen the type of the symbol to enable type inference even if skipToken is not immutable.
type SkipTokenForUseQueries = symbol;

type GetUseQueryOptionsForUseQueries<T> =
	// Part 1: object syntax { queryFnData, error, data }
	T extends {
		queryFnData: infer TQueryFnData;
		error?: infer TError;
		data: infer TData;
	}
		? UseQueryOptionsForUseQueries<TQueryFnData, TError, TData>
		: T extends { queryFnData: infer TQueryFnData; error?: infer TError }
			? UseQueryOptionsForUseQueries<TQueryFnData, TError>
			: T extends { data: infer TData; error?: infer TError }
				? UseQueryOptionsForUseQueries<unknown, TError, TData>
				: // Part 2: tuple syntax [TQueryFnData, TError, TData]
					T extends [infer TQueryFnData, infer TError, infer TData]
					? UseQueryOptionsForUseQueries<TQueryFnData, TError, TData>
					: T extends [infer TQueryFnData, infer TError]
						? UseQueryOptionsForUseQueries<TQueryFnData, TError>
						: T extends [infer TQueryFnData]
							? UseQueryOptionsForUseQueries<TQueryFnData>
							: // Part 3: infer from the actual options object
								T extends {
										queryFn?: QueryFunction<infer TQueryFnData, infer TQueryKey> | SkipTokenForUseQueries;
										select?: (data: any) => infer TData;
										throwOnError?: ThrowOnError<any, infer TError, any, any>;
								  }
								? UseQueryOptionsForUseQueries<
										TQueryFnData,
										unknown extends TError ? DefaultError : TError,
										unknown extends TData ? TQueryFnData : TData,
										TQueryKey
									>
								: // Fallback
									UseQueryOptionsForUseQueries;

// A defined initialData setting yields DefinedUseQueryResult rather than UseQueryResult.
type GetDefinedOrUndefinedQueryResult<T, TData, TError = unknown> = T extends {
	initialData?: infer TInitialData;
}
	? unknown extends TInitialData
		? UseQueryResult<TData, TError>
		: TInitialData extends TData
			? DefinedUseQueryResult<TData, TError>
			: TInitialData extends () => infer TInitialDataResult
				? unknown extends TInitialDataResult
					? UseQueryResult<TData, TError>
					: TInitialDataResult extends TData
						? DefinedUseQueryResult<TData, TError>
						: UseQueryResult<TData, TError>
				: UseQueryResult<TData, TError>
	: UseQueryResult<TData, TError>;

export type GetUseQueryResult<T> =
	// Part 1: object syntax
	T extends { queryFnData: any; error?: infer TError; data: infer TData }
		? GetDefinedOrUndefinedQueryResult<T, TData, TError>
		: T extends { queryFnData: infer TQueryFnData; error?: infer TError }
			? GetDefinedOrUndefinedQueryResult<T, TQueryFnData, TError>
			: T extends { data: infer TData; error?: infer TError }
				? GetDefinedOrUndefinedQueryResult<T, TData, TError>
				: // Part 2: tuple syntax
					T extends [any, infer TError, infer TData]
					? GetDefinedOrUndefinedQueryResult<T, TData, TError>
					: T extends [infer TQueryFnData, infer TError]
						? GetDefinedOrUndefinedQueryResult<T, TQueryFnData, TError>
						: T extends [infer TQueryFnData]
							? GetDefinedOrUndefinedQueryResult<T, TQueryFnData>
							: // Part 3: infer from the actual options object
								T extends {
										queryFn?: QueryFunction<infer TQueryFnData, any> | SkipTokenForUseQueries;
										select?: (data: any) => infer TData;
										throwOnError?: ThrowOnError<any, infer TError, any, any>;
								  }
								? GetDefinedOrUndefinedQueryResult<
										T,
										unknown extends TData ? TQueryFnData : TData,
										unknown extends TError ? DefaultError : TError
									>
								: // Fallback
									UseQueryResult;

/**
 * `QueriesOptions` recursively unwraps the `queries` tuple to infer/enforce each element's
 * type parameters. Mirrors react-query's reducer of the same name.
 */
export type QueriesOptions<
	T extends any[],
	TResults extends any[] = [],
	TDepth extends readonly number[] = [],
> = TDepth["length"] extends MAXIMUM_DEPTH
	? UseQueryOptionsForUseQueries[]
	: T extends []
		? []
		: T extends [infer Head]
			? [...TResults, GetUseQueryOptionsForUseQueries<Head>]
			: T extends [infer Head, ...infer Tails]
				? QueriesOptions<[...Tails], [...TResults, GetUseQueryOptionsForUseQueries<Head>], [...TDepth, 1]>
				: readonly unknown[] extends T
					? T
					: // Homogeneous array (e.g. Array.map result) — infer the element type params.
						T extends UseQueryOptionsForUseQueries<infer TQueryFnData, infer TError, infer TData, infer TQueryKey>[]
						? UseQueryOptionsForUseQueries<TQueryFnData, TError, TData, TQueryKey>[]
						: // Fallback
							UseQueryOptionsForUseQueries[];

/**
 * `QueriesResults` recursively maps the `queries` tuple to the matching result tuple.
 * Mirrors react-query's reducer of the same name.
 */
export type QueriesResults<
	T extends any[],
	TResults extends any[] = [],
	TDepth extends readonly number[] = [],
> = TDepth["length"] extends MAXIMUM_DEPTH
	? UseQueryResult[]
	: T extends []
		? []
		: T extends [infer Head]
			? [...TResults, GetUseQueryResult<Head>]
			: T extends [infer Head, ...infer Tails]
				? QueriesResults<[...Tails], [...TResults, GetUseQueryResult<Head>], [...TDepth, 1]>
				: { [K in keyof T]: GetUseQueryResult<T[K]> };

/**
 * Options for {@link useQueries} / {@link $useQueries}.
 *
 * `queries` is an array of {@link UseQueryOptions}. `combine` optionally derives a single value
 * from all results and narrows the hook's return type to that value.
 */
export type UseQueriesOptions<T extends any[], TCombinedResult = QueriesResults<T>> = {
	queries: readonly [...QueriesOptions<T>] | readonly [...{ [K in keyof T]: GetUseQueryOptionsForUseQueries<T[K]> }];
	combine?: (result: QueriesResults<T>) => TCombinedResult;
};

// ── Shared observer lifecycle ───────────────────────────────────────────────────

/** Result-surfacing hooks invoked by {@link useBaseQueriesObserver} at lifecycle points. */
export type QueriesObserverHandlers<TCombinedResult> = {
	/** Fires on every observer notification (subscription callback). */
	onResult: (result: TCombinedResult, requestUpdate: () => void) => void;
	/** Fires once right after the observer connects — eager read of already-cached data. */
	onConnect?: (result: TCombinedResult) => void;
	/** Fires on every host render (`hostWillRender`). */
	onRender?: () => void;
	/** Fires on host disconnect — the signals hook resets its source signal to pending. */
	onDispose?: () => void;
	/**
	 * Optional server-render handler injected by the signals layer.
	 * When present, the base invokes this instead of its built-in non-held SSR prefetch.
	 * Receives the shared context and must return `{ promise, abort }`.
	 * The base wires `hostDisconnected → abort()`.
	 */
	onServerRender?: (ctx: {
		qc: QueryClient;
		getOpts: () => AnyQueriesOptions;
		reArm: () => void;
		getObserver: () => QueriesObserver<TCombinedResult> | undefined;
		syncResult: () => void;
	}) => { promise: Promise<void>; abort: () => void };
};

/** Accessor handle returned by {@link useBaseQueriesObserver}. */
export type QueriesObserverHandle<TCombinedResult> = {
	getObserver: () => QueriesObserver<TCombinedResult> | undefined;
	/** Computes the current combined result, falling back to a pending array before connect. */
	getCurrentResult: () => TCombinedResult;
	/** Re-applies current defaulted options to the observer — used by the signals hook after a held key resolves. */
	reArm: () => void;
	/** The resolved query client ref — exposed so `$useQueries` can access it in its own lifecycle block. */
	clientRef: Ref<QueryClient>;
};

export type AnyQueriesOptions = {
	queries: readonly QueryObserverOptions[];
	combine?: (result: QueryObserverResult[]) => unknown;
};

/**
 * Applies the client's default options to each query in the list and stamps
 * `_optimisticResults` so TanStack Query knows whether cache is being restored.
 */
function defaultedQueries(qc: QueryClient, opts: AnyQueriesOptions, isRestoring = false): QueryObserverOptions[] {
	return opts.queries.map(o => {
		const d = qc.defaultQueryOptions(o);
		if (isQueryKeyHeld(d.queryKey)) {
			d.enabled = false;
		}
		d._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
		return d;
	});
}

/**
 * Builds the pending fallback result used before the observer connects (or after disconnect):
 * one `pendingQueryState` per query, passed through `combine` when present.
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- generic needed for caller to specify the combined result type
export function pendingQueriesResult<TCombinedResult>(opts: AnyQueriesOptions): TCombinedResult {
	const arr = opts.queries.map(
		() => ({ ...pendingQueryState, refetch: noObserverRefetch }) as unknown as QueryObserverResult,
	);
	return (opts.combine ? opts.combine(arr) : arr) as TCombinedResult;
}

/**
 * Shared observer lifecycle for the classic and signals `useQueries` hooks.
 *
 * Owns option normalization, client resolution, the {@link QueriesObserver} subscription, and the
 * `hostWillRender → setQueries` step — mirroring {@link useBaseQueryObserver} for the single-query
 * hooks. The classic hook only needs `onResult`; the signals hook additionally uses
 * `onConnect`/`onRender`/`onDispose` to keep its source signal eagerly populated.
 */
export function useBaseQueriesObserver<TCombinedResult>(
	getOptions: AnyQueriesOptions | (() => AnyQueriesOptions),
	client: QueryClient | Ref<QueryClient> | undefined,
	handlers: QueriesObserverHandlers<TCombinedResult>,
): QueriesObserverHandle<TCombinedResult> {
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	const clientRef = useQueryClient(client);
	const isRestoringRef = useIsRestoring();

	let observer: QueriesObserver<TCombinedResult> | undefined;

	// Computes the combined result via the observer's optimistic path — recomputes `combine`
	// each call, matching react-query's per-render behavior.
	const combinedFrom = (
		obs: QueriesObserver<TCombinedResult>,
		qc: QueryClient,
		isRestoring: boolean,
	): TCombinedResult => {
		const opts = getOpts();
		// `combine` is cast to `never` because the user-facing variadic signature is wider than
		// QueriesObserver's internal single-tuple type; the runtime value is forwarded unchanged.
		const [, getCombinedResult, trackResult] = obs.getOptimisticResult(
			defaultedQueries(qc, opts, isRestoring),
			opts.combine as never,
		);
		return getCombinedResult(trackResult());
	};

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		// oxlint-disable-next-line typescript/unbound-method -- requestUpdate is a pre-bound function provided by the framework context
		({ qc, isRestoring, requestUpdate }) => {
			const opts = getOpts();
			observer = new QueriesObserver<TCombinedResult>(qc, defaultedQueries(qc, opts, isRestoring), {
				combine: opts.combine as never,
			});

			// Sync immediately in case data is already cached.
			handlers.onConnect?.(combinedFrom(observer, qc, isRestoring));

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					if (observer) {
						handlers.onResult(combinedFrom(observer, qc, isRestoringRef.current), requestUpdate);
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
		{ qc: clientRef, isRestoring: isRestoringRef },
	);

	use(() => ({
		hostWillRender() {
			handlers.onRender?.();
		},
	}));

	const reArm = (): void => {
		const qc = clientRef.current;
		if (observer && qc) {
			const o = getOpts();
			observer.setQueries(defaultedQueries(qc, o, isRestoringRef.current), { combine: o.combine as never });
		}
	};

	// Server only: seed the cache before render() runs. Stencil awaits all hostWillLoad
	// promises in parallel, so this does not block the observer subscription above.
	// When `onServerRender` is injected (signals layer), delegates to that (covers both held
	// and non-held, with reactive settle). Otherwise falls back to the built-in non-held prefetch
	// (classic path). The base owns abort wiring: hostDisconnected → abort().
	use(() => {
		let abort: (() => void) | undefined;
		return {
			hostWillLoad(): Promise<void> | void {
				if (!detectServer()) {
					return;
				}
				const qc = clientRef.current;
				if (!qc) {
					return;
				}

				const syncResult = (): void => {
					if (observer) {
						handlers.onConnect?.(combinedFrom(observer, qc, isRestoringRef.current));
					}
				};

				if (handlers.onServerRender) {
					// Signal layer injected a settle — it handles both held and non-held.
					const r = handlers.onServerRender({ qc, getOpts, reArm, getObserver: () => observer, syncResult });
					abort = r.abort;
					return r.promise;
				}

				// Built-in non-held prefetch (classic path).
				return Promise.all(
					getOpts()
						.queries.filter(q => q.enabled !== false && !isQueryKeyHeld(q.queryKey))
						// oxlint-disable-next-line typescript/promise-function-async -- .map callback returning prefetchQuery(q) Promise; async/await adds no value in this position
						.map(q => qc.prefetchQuery(q)),
				).then(syncResult);
			},
			hostDisconnected(): void {
				abort?.();
			},
		};
	});

	return {
		getObserver: () => observer,
		getCurrentResult: () => {
			const qc = clientRef.current;
			return observer && qc
				? combinedFrom(observer, qc, isRestoringRef.current)
				: pendingQueriesResult<TCombinedResult>(getOpts());
		},
		reArm,
		clientRef,
	};
}
