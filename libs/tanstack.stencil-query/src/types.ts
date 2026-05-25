import type { Ref } from "@ssv/stencil-core";
import type {
	DefaultError,
	DefinedQueryObserverResult,
	InitialDataFunction,
	MutateFunction,
	MutationObserverOptions,
	MutationObserverResult,
	NonUndefinedGuard,
	OmitKeyof,
	Override,
	QueryFunction,
	QueryKey,
	QueryObserverOptions,
	QueryObserverResult,
} from "@tanstack/query-core";

// ── useQuery ──────────────────────────────────────────────────────────────────

/**
 * Options for {@link useQuery}.
 * Equivalent to react-query's `UseQueryOptions` — `QueryObserverOptions` without the
 * React-specific `suspense` field (not applicable in Stencil).
 */
export type UseQueryOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = OmitKeyof<QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>, "suspense">;

/**
 * {@link UseQueryOptions} variant where `initialData` is always defined.
 * When this overload is matched, {@link useQuery} returns {@link DefinedUseQueryResult}
 * (`data: TData`, never `undefined`).
 */
export type DefinedInitialDataOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
	initialData: NonUndefinedGuard<TQueryFnData> | (() => NonUndefinedGuard<TQueryFnData>);
	queryFn?: QueryFunction<TQueryFnData, TQueryKey>;
};

/**
 * {@link UseQueryOptions} variant where `initialData` is absent or `undefined`.
 * This is the default — `useQuery` returns {@link UseQueryResult} (`data: TData | undefined`).
 */
export type UndefinedInitialDataOptions<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
	initialData?: undefined | InitialDataFunction<NonUndefinedGuard<TQueryFnData>> | NonUndefinedGuard<TQueryFnData>;
};

/** Return type of {@link useQuery} when `initialData` is always defined — `data: TData`, never `undefined`. */
export type DefinedUseQueryResult<TData = unknown, TError = DefaultError> = DefinedQueryObserverResult<TData, TError>;

/**
 * Return type of {@link useQuery}.
 * Direct alias for `QueryObserverResult` — exposes every field TanStack Query populates,
 * matching react-query's `UseQueryResult` exactly (`isLoading`, `isRefetching`, `isFetched`,
 * `failureCount`, `dataUpdatedAt`, etc.).
 */
export type UseQueryResult<TData = unknown, TError = DefaultError> = QueryObserverResult<TData, TError>;

// ── useMutation ───────────────────────────────────────────────────────────────

/**
 * Options for {@link useMutation}.
 * Equivalent to react-query's `UseMutationOptions`.
 */
export type UseMutationOptions<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
> = OmitKeyof<MutationObserverOptions<TData, TError, TVariables, TContext>, "_defaulted">;

/** Fire-and-forget `mutate` — same parameter signature as {@link MutateFunction} but returns `void`. */
export type UseMutateFunction<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = (
	...args: Parameters<MutateFunction<TData, TError, TVariables, TContext>>
) => void;

/** Async `mutateAsync` — returns `Promise<TData>`. Alias for {@link MutateFunction}. */
export type UseMutateAsyncFunction<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
> = MutateFunction<TData, TError, TVariables, TContext>;

/**
 * Return type of {@link useMutation}.
 * Mirrors react-query's `UseMutationResult` — all `MutationObserverResult` fields
 * (`context`, `submittedAt`, `isPaused`, `failureCount`, etc.) plus a fire-and-forget
 * `mutate` override and an async `mutateAsync`.
 */
export type UseMutationResult<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = Override<
	MutationObserverResult<TData, TError, TVariables, TContext>,
	{ mutate: UseMutateFunction<TData, TError, TVariables, TContext> }
> & {
	mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext>;
};

// ── Ref aliases ───────────────────────────────────────────────────────────────

/** {@link Ref} alias for the result of {@link useQuery}. */
export type UseQueryRef<TData = unknown, TError = DefaultError> = Ref<UseQueryResult<TData, TError>>;

/** {@link Ref} alias for the result of {@link useQuery} when `initialData` is always defined. */
export type DefinedUseQueryRef<TData = unknown, TError = DefaultError> = Ref<DefinedUseQueryResult<TData, TError>>;

/** {@link Ref} alias for the result of {@link useMutation}. */
export type UseMutationRef<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = Ref<
	UseMutationResult<TData, TError, TVariables, TContext>
>;
