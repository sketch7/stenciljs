import { createContext, provideContext, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { QueryClient, provideQueryClient } from "@ssv/tanstack.stencil-query";
import type { ProvideQueryClientOptions } from "@ssv/tanstack.stencil-query";

/** Context key for the LoL draft feature's `QueryClient`. */
export const lolDraftQueryClientKey = createContext<QueryClient>(undefined, { name: "LolDraftQueryClient" });

/**
 * Provides the LoL draft `QueryClient` to all descendant components.
 *
 * Wraps `provideQueryClient` and additionally exposes the client via `lolDraftQueryClientKey`
 * so feature hooks can consume it without explicit parameter passing.
 *
 * @example
 * ```ts
 * provideLolDraftQueryClient({
 *   client: new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
 * });
 * useQueryHydration();
 * ```
 */
export function provideLolDraftQueryClient(options?: ProvideQueryClientOptions): QueryClient {
	const qc = provideQueryClient(options);
	provideContext(lolDraftQueryClientKey, qc);
	return qc;
}

/** Resolves the LoL draft `QueryClient` from context. */
export function useLolDraftQueryClient(): Ref<QueryClient> {
	return useContext(lolDraftQueryClientKey);
}

/** Context key for the LoL draft content `QueryClient` (test). */
export const lolDraftContentQueryClientKey = createContext<QueryClient>(undefined, {
	name: "LolDraftContentQueryClient",
});

/**
 * Provides a dedicated content `QueryClient` with `staleTime: Infinity` and all
 * background refetches disabled. For testing purposes only.
 */
export function provideLolDraftContentQueryClient(options?: ProvideQueryClientOptions): QueryClient {
	const contentClient =
		options?.client ??
		new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: Infinity,
					refetchOnWindowFocus: false,
					refetchOnMount: false,
					refetchOnReconnect: false,
				},
			},
		});
	console.warn("[lol-query-client] provideLolDraftContentQueryClient created:", contentClient);
	provideContext(lolDraftContentQueryClientKey, contentClient);
	return contentClient;
}

/** Resolves the LoL draft content `QueryClient` from context. */
export function useLolDraftContentQueryClient(): Ref<QueryClient> {
	return useContext(lolDraftContentQueryClientKey);
}
