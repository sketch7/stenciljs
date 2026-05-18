export * from "@tanstack/query-core";
export type { Ref } from "@ssv/stencil.core";

export { provideQueryClient, queryClientKey, useQueryClient } from "./query-client-context";
export type { ProvideQueryClientOptions } from "./query-client-context";
export type {
	DefinedInitialDataOptions,
	DefinedUseQueryRef,
	DefinedUseQueryResult,
	UndefinedInitialDataOptions,
	UseMutateAsyncFunction,
	UseMutateFunction,
	UseMutationOptions,
	UseMutationRef,
	UseMutationResult,
	UseQueryOptions,
	UseQueryRef,
	UseQueryResult,
} from "./types";
export { useMutation } from "./use-mutation";
export { useQuery } from "./use-query";
