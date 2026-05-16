export * from "@tanstack/query-core";

export { provideQueryClient, queryClientKey, useQueryClient } from "./query-client-context";
export type { ProvideQueryClientOptions } from "./query-client-context";
export type {
	DefinedInitialDataOptions,
	DefinedUseQueryResult,
	UndefinedInitialDataOptions,
	UseMutateAsyncFunction,
	UseMutateFunction,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from "./types";
export { useMutation } from "./use-mutation";
export { useQuery } from "./use-query";
