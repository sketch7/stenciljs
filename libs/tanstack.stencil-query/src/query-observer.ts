import { detectServer, use, useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { computed, createWatcher } from "@ssv/stencil-signals";
import { QueryObserver, notifyManager } from "@tanstack/query-core";
import type {
	DefaultError,
	DefinedQueryObserverResult,
	InitialDataFunction,
	NonUndefinedGuard,
	OmitKeyof,
	QueryClient,
	QueryFunction,
	QueryKey,
	QueryObserverOptions,
	QueryObserverResult,
	RefetchOptions,
} from "@tanstack/query-core";

import { useIsRestoring } from "./is-restoring";
import { useQueryClient } from "./query-client-context";

// ── useQuery types ────────────────────────────────────────────────────────────

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

/** {@link Ref} alias for the result of {@link useQuery}. */
export type UseQueryRef<TData = unknown, TError = DefaultError> = Ref<UseQueryResult<TData, TError>>;

/** {@link Ref} alias for the result of {@link useQuery} when `initialData` is always defined. */
export type DefinedUseQueryRef<TData = unknown, TError = DefaultError> = Ref<DefinedUseQueryResult<TData, TError>>;

/** Base query state shared by both hooks as the not-yet-connected value. Excludes `refetch` (an action). */
export const pendingQueryState = {
	data: undefined,
	isPending: true,
	isLoading: true,
	isInitialLoading: true,
	isSuccess: false,
	isError: false,
	isFetching: false,
	isRefetching: false,
	isFetched: false,
	isFetchedAfterMount: false,
	isPlaceholderData: false,
	isLoadingError: false,
	isRefetchError: false,
	isStale: false,
	status: "pending" as const,
	fetchStatus: "idle" as const,
	error: null,
	failureReason: null,
	failureCount: 0,
	dataUpdatedAt: 0,
	errorUpdatedAt: 0,
	errorUpdateCount: 0,
};

/** Rejection used by `refetch` before the observer is connected to the host. */
export const noObserverRefetch = async (): Promise<never> => {
	throw new Error("[ssv:query] Cannot refetch — observer not yet connected.");
};

/** Result-surfacing hooks invoked by {@link useBaseQueryObserver} at the appropriate lifecycle points. */
export type QueryObserverHandlers<TData, TError> = {
	/** Fires on every observer notification (subscription callback). */
	onResult: (result: QueryObserverResult<TData, TError>, requestUpdate: () => void) => void;
	/** Fires once right after the observer connects — eager read of already-cached data. */
	onConnect?: (result: QueryObserverResult<TData, TError>) => void;
	/** Fires in `hostWillRender` after `setOptions` — SSR/hydration sync before paint. */
	onRender?: (result: QueryObserverResult<TData, TError>) => void;
	/** Fires on host disconnect — the signals hook resets its source signal to pending. */
	onDispose?: () => void;
};

/** Observer accessor + `refetch` action shared by `useQuery` and `$useQuery`. */
export type QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	refetch: QueryObserverResult<TData, TError>["refetch"];
	getObserver: () => QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
};

/**
 * Upper bound on how long the SSR settle waits for a held query's key to resolve before giving up
 * and rendering without it. A held query whose key never resolves (e.g. a permanently-undefined
 * upstream) must not block `componentWillLoad` indefinitely — the outer SSR worker timeout is the
 * final backstop, but this keeps a single stuck query from monopolising the render budget.
 */
const SSR_HELD_QUERY_TIMEOUT_MS = 15_000;

/**
 * A query is **held** when its key is not yet resolvable — `undefined`, or an array with an
 * `undefined` segment (a signal-derived key that is not ready yet — from a prop, route param,
 * another query's data, etc.). Held queries are gated rather than fetched with an undefined key
 * (mirrors Angular `resource`, whose `undefined` params keep the resource idle). `null` segments are
 * treated as valid values: use `null` (not `undefined`) for a key part that is legitimately
 * optional/absent so it still fetches.
 *
 * See the "Signal-dependent queries & SSR" section of the README for the full behaviour and convention.
 */
function isQueryKeyHeld(queryKey: unknown): boolean {
	if (queryKey === undefined) {
		return true;
	}
	if (Array.isArray(queryKey)) {
		return queryKey.some(segment => segment === undefined);
	}
	return false;
}

/**
 * Shared observer lifecycle for the classic and signals query hooks.
 *
 * Owns option normalization, client resolution, the `QueryObserver` subscription, and the
 * `hostWillRender → setOptions` step. The classic hook only needs `onResult` (lazy `Ref` read +
 * `requestUpdate`); the signals hook additionally uses `onConnect`/`onRender`/`onDispose` to keep
 * its source signal eagerly populated and reset on disconnect.
 *
 * **SSR auto-prefetch** — on the server, automatically calls `qc.prefetchQuery(opts)` in
 * `hostWillLoad` so Stencil's `componentWillLoad` awaits data before `render()`.
 * Set `enabled: false` to opt a query out of SSR prefetching.
 *
 * **Held queries** — when the `queryKey` has an `undefined` segment (a signal-derived key that is
 * not ready yet — from a prop, route param, another query's data, etc.; see {@link isQueryKeyHeld}),
 * the observer stays idle instead of fetching with an undefined key, and the SSR settle reactively
 * waits for the key to resolve — then prefetches once. See the "Signal-dependent queries & SSR"
 * section of the README.
 */
export function useBaseQueryObserver<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client: QueryClient | Ref<QueryClient> | undefined,
	handlers: QueryObserverHandlers<TData, TError>,
): QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey> {
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	const clientRef = useQueryClient(client);
	const isRestoringRef = useIsRestoring();

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;

	const refetch: QueryObserverResult<TData, TError>["refetch"] = async (options?: RefetchOptions) =>
		observer?.refetch(options) ?? noObserverRefetch();

	/** Returns defaulted options with `_optimisticResults` stamped. */
	const defaultedOptions = (qc: QueryClient, isRestoring: boolean) => {
		const d = qc.defaultQueryOptions(getOpts()) as QueryObserverOptions<
			TQueryFnData,
			TError,
			TData,
			TQueryFnData,
			TQueryKey
		>;
		// Held query (key not yet resolved): keep the observer idle so it never fetches with an
		// undefined key. When the key resolves, a later setOptions (hostWillRender on the client, or
		// the SSR settle below) re-evaluates this and lets the observer fetch.
		if (isQueryKeyHeld(d.queryKey)) {
			d.enabled = false;
		}
		d._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
		return d;
	};

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		// oxlint-disable-next-line typescript/unbound-method -- requestUpdate is a pre-bound function provided by the framework context
		({ qc, isRestoring, requestUpdate }) => {
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				defaultedOptions(qc, isRestoring),
			);

			// Sync immediately in case data is already cached.
			handlers.onConnect?.(observer.getCurrentResult());

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					const r = observer?.getCurrentResult();
					if (r) {
						handlers.onResult(r, requestUpdate);
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
			const qc = clientRef.current;
			if (!observer || !qc) {
				return;
			}
			// TODO(perf): skip setOptions when options is static (not a function) — mirrors Lit BaseController.onHostUpdate()
			observer.setOptions(defaultedOptions(qc, isRestoringRef.current));
			// Sync latest result before each render — mirrors useQuery's lazy Ref read.
			// Ensures SSR/hydration sees the cached data even if the subscription
			// callback was batched as a microtask and not yet flushed.
			handlers.onRender?.(observer.getCurrentResult());
		},
	}));

	// Server only: seed the cache before render() runs. Stencil awaits all hostWillLoad
	// promises in parallel, so this does not block the observer subscription above.
	// `enabled: false` opts the query out of SSR prefetching (mirrors client behavior).
	// After prefetch resolves, re-syncs the observer result into handlers so signals see
	// the populated cache before render() (hostWillRender may not fire in test environments
	// that wrap render() — e.g. when useSignalWatcher() replaces host.render).
	//
	// Chained/dependent queries: a query whose key derives from not-yet-resolved upstream data is
	// *held* (its queryKey has an `undefined` segment) at hostWillLoad time. Rather than fetching
	// with that undefined key, the settle reactively waits for the key to resolve — driven by the
	// same signals the key getter reads, so an upstream query resolving (and updating its signal)
	// re-evaluates this query's key — then prefetches once. Bounded by SSR_HELD_QUERY_TIMEOUT_MS.
	use(() => ({
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
					handlers.onConnect?.(observer.getCurrentResult());
				}
			};

			const initial = getOpts();
			if (initial.enabled === false) {
				return;
			}
			if (!isQueryKeyHeld(initial.queryKey)) {
				return qc.prefetchQuery(initial).then(syncResult);
			}

			// Held: the queryKey is not yet resolved. Wait reactively until it settles.
			return new Promise<void>(resolve => {
				let done = false;

				const readiness = computed(() => {
					const opts = getOpts();
					return { opts, disabled: opts.enabled === false, held: isQueryKeyHeld(opts.queryKey) };
				});

				const finish = (): void => {
					if (done) {
						return;
					}
					done = true;
					watcher.dispose();
					clearTimeout(timer);
					resolve();
				};

				const check = (): void => {
					if (done) {
						return;
					}
					const { opts, disabled, held } = readiness();
					if (disabled) {
						finish();
						return;
					}
					if (!held) {
						watcher.dispose();
						// Re-arm the observer to the now-resolved key (mirrors hostWillRender's
						// setOptions) so its result reflects the prefetched data when synced.
						observer?.setOptions(defaultedOptions(qc, isRestoringRef.current));
						qc.prefetchQuery(opts).then(syncResult).then(finish, finish);
					}
				};

				// Reading a (computed) signal is forbidden inside the watcher's synchronous notify
				// phase, so defer re-evaluation to a microtask.
				const watcher = createWatcher(() => queueMicrotask(check));
				const timer = setTimeout(finish, SSR_HELD_QUERY_TIMEOUT_MS);

				readiness();
				watcher.watch(readiness);
				check();
			});
		},
	}));

	return { refetch, getObserver: () => observer };
}
