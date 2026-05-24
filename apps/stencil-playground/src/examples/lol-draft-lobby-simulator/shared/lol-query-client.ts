import { createContext, provideContext, useContext } from "@ssv/stencil.core";
import type { Ref } from "@ssv/stencil.core";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import type { ProvideQueryClientOptions, QueryClient } from "@ssv/tanstack.stencil-query";

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
 * readonly #queryClient = provideLolDraftQueryClient({
 *   client: new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
 *   withHydration: this.#ts,
 * });
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
