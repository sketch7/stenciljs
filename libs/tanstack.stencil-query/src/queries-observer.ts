// oxlint-disable @typescript-eslint/no-explicit-any -- ported TanStack `useQueries` variadic type machinery relies on `any` in conditional-inference positions; replacing with `unknown` breaks per-element type inference
import { use, useLoadEffect } from "@ssv/stencil-core";
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

import { useQueryClient } from "./query-client-context";
import { noObserverRefetch, pendingQueryState } from "./query-observer";
import type { DefinedUseQueryResult, UseQueryOptions, UseQueryResult } from "./query-observer";

// ── useQueries variadic types ──────────────────────────────────────────────────
// Ported from @tanstack/react-query's `useQueries` type machinery so each element's
// data/error types are preserved through the queries tuple. See:
// https://github.com/TanStack/query/blob/main/packages/react-query/src/useQueries.ts

/**
 * The {@link UseQueryOptions} accepted inside a `queries` array element.
 * `placeholderData` always receives `undefined` here (no previous element data).
 */
type UseQueryOptionsForUseQueries<
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

type GetUseQueryResult<T> =
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
	/** Fires in `hostWillRender` after `setQueries` — SSR/hydration sync before paint. */
	onRender?: (result: TCombinedResult) => void;
	/** Fires on host disconnect — the signals hook resets its source signal to pending. */
	onDispose?: () => void;
};

/** Accessor handle returned by {@link useBaseQueriesObserver}. */
export type QueriesObserverHandle<TCombinedResult> = {
	getObserver: () => QueriesObserver<TCombinedResult> | undefined;
	/** Computes the current combined result, falling back to a pending array before connect. */
	getCurrentResult: () => TCombinedResult;
};

type AnyQueriesOptions = {
	queries: readonly QueryObserverOptions[];
	combine?: (result: QueryObserverResult[]) => unknown;
};

/** Applies the client's default options to each query in the list. */
function defaultedQueries(qc: QueryClient, opts: AnyQueriesOptions): QueryObserverOptions[] {
	return opts.queries.map(o => qc.defaultQueryOptions(o));
}

/**
 * Builds the pending fallback result used before the observer connects (or after disconnect):
 * one `pendingQueryState` per query, passed through `combine` when present.
 */
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

	let observer: QueriesObserver<TCombinedResult> | undefined;

	// Computes the combined result via the observer's optimistic path — recomputes `combine`
	// each call, matching react-query's per-render behaviour.
	const combinedFrom = (obs: QueriesObserver<TCombinedResult>, qc: QueryClient): TCombinedResult => {
		const opts = getOpts();
		const [, getCombinedResult, trackResult] = obs.getOptimisticResult(
			defaultedQueries(qc, opts),
			opts.combine as never,
		);
		return getCombinedResult(trackResult()) as TCombinedResult;
	};

	// Pending fallback before the observer connects (or after disconnect).
	const pendingResult = (): TCombinedResult => pendingQueriesResult<TCombinedResult>(getOpts());

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		({ qc, requestUpdate }) => {
			const opts = getOpts();
			observer = new QueriesObserver<TCombinedResult>(qc, defaultedQueries(qc, opts), {
				combine: opts.combine as never,
			});

			// Sync immediately in case data is already cached.
			handlers.onConnect?.(combinedFrom(observer, qc));

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					if (observer) {
						handlers.onResult(combinedFrom(observer, qc), requestUpdate);
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
			const opts = getOpts();
			observer.setQueries(defaultedQueries(qc, opts), { combine: opts.combine as never });
			handlers.onRender?.(combinedFrom(observer, qc));
		},
	}));

	return {
		getObserver: () => observer,
		getCurrentResult: () => {
			const qc = clientRef.current;
			return observer && qc ? combinedFrom(observer, qc) : pendingResult();
		},
	};
}
