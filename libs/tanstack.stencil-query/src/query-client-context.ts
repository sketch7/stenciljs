import { createContext, makeTransferKey, provideContext, use, useContext } from "@ssv/stencil.core";
import type { ContextRef, TransferState } from "@ssv/stencil.core";
import { dehydrate, hydrate, QueryClient } from "@tanstack/query-core";
import type { DehydratedState } from "@tanstack/query-core";

/** Transfer key used to dehydrate/hydrate the QueryClient via {@link TransferState}. */
const DEHYDRATED_KEY = makeTransferKey<DehydratedState>("state");

/**
 * Context key used to distribute a `QueryClient` through the component tree.
 * Populated by {@link provideQueryClient}; consumed by {@link useQueryClient},
 * {@link useQuery}, and {@link useMutation}.
 */
export const queryClientKey = createContext<QueryClient>(undefined, { name: "QueryClient" });

/**
 * Options for {@link provideQueryClient}.
 */
export type ProvideQueryClientOptions = {
	/** An existing `QueryClient` instance to use. Defaults to a new instance. */
	client?: QueryClient;
	/**
	 * Wire up SSR dehydration + client hydration via a `TransferState` created with
	 * `provideTransferState()` from `@ssv/stencil.core`.
	 *
	 * Mirrors React Query's `HydrationBoundary` pattern — the component owns the transfer
	 * state scope; `provideQueryClient` only wires the dehydrate/hydrate lifecycle hooks.
	 *
	 * **Field declaration order matters**: `provideTransferState` must be called before
	 * `provideQueryClient` so the transfer state is available when wiring up.
	 *
	 * @example
	 * ```ts
	 * // 1. Create transfer state scope first (owns serialization)
	 * readonly #ts = provideTransferState('my-scope');
	 * // 2. Pass it in — no internal TS creation
	 * readonly #queryClient = provideQueryClient({ withHydration: this.#ts });
	 *
	 * render() {
	 *   return <>{this.#ts.toScriptElement()}...</>;
	 * }
	 * ```
	 */
	withHydration?: TransferState;
};

/**
 * Provides a `QueryClient` to all descendant components and mounts/unmounts it with the host lifecycle.
 *
 * Call in a class field initializer. Returns the client so it can be stored if needed.
 *
 * @example
 * ```ts
 * export class AppRoot extends SsvElement {
 *   readonly #queryClient = provideQueryClient();
 * }
 * ```
 *
 * @example
 * ```ts
 * readonly #queryClient = provideQueryClient(new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
 * ```
 *
 * @example
 * ```ts
 * // SSR dehydration + client hydration:
 * readonly #ts = provideTransferState('posts');
 * readonly #queryClient = provideQueryClient({ withHydration: this.#ts });
 * ```
 */
export function provideQueryClient(clientOrOptions?: QueryClient | ProvideQueryClientOptions): QueryClient {
	const qc =
		clientOrOptions instanceof QueryClient
			? clientOrOptions
			: ((clientOrOptions as ProvideQueryClientOptions | undefined)?.client ?? new QueryClient());

	use({
		hostConnected() {
			qc.mount();
		},
		hostDisconnected() {
			qc.unmount();
		},
	});

	provideContext(queryClientKey, qc);

	const withHydration =
		clientOrOptions instanceof QueryClient
			? undefined
			: (clientOrOptions as ProvideQueryClientOptions | undefined)?.withHydration;

	if (withHydration) {
		const ts = withHydration;

		use({
			hostWillRender() {
				ts.set(DEHYDRATED_KEY, dehydrate(qc));
			},
			hostConnected() {
				const dehydrated = ts.get(DEHYDRATED_KEY);
				console.warn(">>>> hostConnected hydrate", { DEHYDRATED_KEY, dehydrated });
				if (dehydrated !== undefined) {
					hydrate(qc, dehydrated);
				}
			},
		});
	}

	return qc;
}

/**
 * Resolves the nearest `QueryClient` from the component tree, or returns the explicit client if provided.
 *
 * Returns a {@link ContextRef} whose `.current` is available after `hostConnected` (before the first render).
 * Pass an explicit `client` to bypass context — useful in tests.
 *
 * @example
 * ```ts
 * readonly #client = useQueryClient();
 *
 * // in event handler or onSuccess:
 * this.#client.current.invalidateQueries({ queryKey: ['posts'] });
 * ```
 */
export function useQueryClient(client?: QueryClient): ContextRef<QueryClient> {
	if (client) {
		return { current: client };
	}
	return useContext(queryClientKey);
}
