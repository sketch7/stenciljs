export * from "@tanstack/query-core";
export type { Ref } from "@ssv/stencil-core";

export { provideQueryClient, queryClientKey, useQueryClient } from "./query-client-context";
export { provideIsRestoring, isRestoringKey, useIsRestoring } from "./is-restoring";
export { queryOptions } from "./query-options";
export type { DefinedQueryOptions } from "./query-options";
export type { ProvideQueryClientOptions } from "./query-client-context";
export type {
	DefinedInitialDataOptions,
	DefinedUseQueryRef,
	DefinedUseQueryResult,
	UndefinedInitialDataOptions,
	UseQueryOptions,
	UseQueryRef,
	UseQueryResult,
} from "./query-observer";
export type {
	UseMutateAsyncFunction,
	UseMutateFunction,
	UseMutationOptions,
	UseMutationRef,
	UseMutationResult,
} from "./mutation-observer";
export type { UsePrefetchQueryOptions } from "./use-prefetch-query";
export { useMutation } from "./use-mutation";
export { usePrefetchQuery } from "./use-prefetch-query";
export { useQuery } from "./use-query";
export { useQueries } from "./use-queries";
export type { QueriesOptions, QueriesResults, UseQueriesOptions } from "./queries-observer";
export { useQueryHydration } from "./use-query-hydration";
export type { UseQueryHydrationOptions } from "./use-query-hydration";
