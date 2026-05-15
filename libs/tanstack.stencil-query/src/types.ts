import type {
	DefaultError,
	FetchStatus,
	MutateOptions,
	MutationStatus,
	QueryObserverResult,
	QueryStatus,
	RefetchOptions,
} from "@tanstack/query-core";

/** Return shape of {@link useQuery}. Properties are live getters — always reflect the latest observer state. */
export type UseQueryResult<TData = unknown, TError = DefaultError> = {
	readonly data: TData | undefined;
	readonly isPending: boolean;
	readonly isSuccess: boolean;
	readonly isError: boolean;
	readonly error: TError | null;
	readonly isFetching: boolean;
	readonly status: QueryStatus;
	readonly fetchStatus: FetchStatus;
	refetch(options?: RefetchOptions): Promise<QueryObserverResult<TData, TError>>;
};

/** Return shape of {@link useMutation}. Properties are live getters — always reflect the latest observer state. */
export type UseMutationResult<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = {
	readonly data: TData | undefined;
	readonly isPending: boolean;
	readonly isSuccess: boolean;
	readonly isError: boolean;
	readonly error: TError | null;
	readonly isIdle: boolean;
	readonly variables: TVariables | undefined;
	readonly status: MutationStatus;
	mutate(variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>): void;
	mutateAsync(variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>): Promise<TData>;
	reset(): void;
};
