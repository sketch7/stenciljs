import { detectServer, use, useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
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
export type QueryObserverHandlers<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	/** Fires on every observer notification (subscription callback). */
	onResult: (result: QueryObserverResult<TData, TError>, requestUpdate: () => void) => void;
	/** Fires once right after the observer connects — eager read of already-cached data. */
	onConnect?: (result: QueryObserverResult<TData, TError>) => void;
	/**
	 * Fires on every host render (`hostWillRender`). Classic hooks pass `() => reArm()` to
	 * re-apply the (possibly changed) options each render — their only reactivity. Signal hooks
	 * omit it: they react purely via their client `effect` on the options signal.
	 */
	onRender?: () => void;
	/** Fires on host disconnect — the signals hook resets its source signal to pending. */
	onDispose?: () => void;
	/**
	 * Optional server-render handler injected by the signals layer.
	 * When present, the base invokes this instead of its built-in non-held SSR prefetch.
	 * Receives the shared context and must return `{ promise, abort }`.
	 * The base wires `hostDisconnected → abort()`.
	 */
	onServerRender?: (ctx: {
		qc: QueryClient;
		getOpts: () => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
		reArm: () => void;
		getObserver: () => QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
		syncResult: () => void;
	}) => { promise: Promise<void>; abort: () => void };
};

/** Observer accessor + `refetch` action shared by `useQuery` and `$useQuery`. */
export type QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	refetch: QueryObserverResult<TData, TError>["refetch"];
	getObserver: () => QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
	/** Re-applies current defaulted options to the observer — used by the signals hook after a held key resolves. */
	reArm: () => void;
	/** The resolved query client ref — exposed so `$useQuery` can access it in its own lifecycle block. */
	clientRef: Ref<QueryClient>;
};

/**
 * A query is **held** when its key is not yet resolvable — `undefined`, or an array with an
 * `undefined` segment (a signal-derived key that is not ready yet — from a prop, route param,
 * another query's data, etc.). Held queries are gated rather than fetched with an undefined key
 * (mirrors Angular `resource`, whose `undefined` params keep the resource idle). `null` segments are
 * treated as valid values: use `null` (not `undefined`) for a key part that is legitimately
 * optional/absent so it still fetches.
 *
 * See the "Signal-dependent queries & SSR" section of the README for the full behavior and convention.
 */
export function isQueryKeyHeld(queryKey: unknown): boolean {
	if (queryKey === undefined) {
		return true;
	}
	if (Array.isArray(queryKey)) {
		return queryKey.some(segment => segment === undefined);
	}
	return false;
}

/**
 * Pure helper: normalize raw options against the query client defaults and stamp
 * `_optimisticResults`.  Extracted from the inner closure so the signals layer and
 * future multi-query hooks can reuse it without importing `@ssv/stencil-signals`.
 *
 * - Held query (key not yet resolved): forces `enabled = false` so the observer never
 *   fetches with an `undefined` key; a later `setOptions` call re-evaluates once the
 *   key resolves.
 * - `_optimisticResults` is stamped here (observer-ctor time) so `getCurrentResult()`
 *   returns cached data immediately at `onConnect` ("reads cached data immediately").
 */
export function defaultedQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	qc: QueryClient,
	getOpts: () => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
	isRestoring: boolean,
): QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> {
	const d = qc.defaultQueryOptions(getOpts()) as QueryObserverOptions<
		TQueryFnData,
		TError,
		TData,
		TQueryFnData,
		TQueryKey
	>;
	if (isQueryKeyHeld(d.queryKey)) {
		d.enabled = false;
	}
	d._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
	return d;
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
 * the observer stays idle instead of fetching with an undefined key. During SSR the base skips
 * prefetch for held keys — the signals hook (`$useQuery`) owns the reactive settle in its own
 * lifecycle block, keeping `@ssv/stencil-signals` out of the classic `useQuery` bundle.
 * See the "Signal-dependent queries & SSR" section of the README.
 */
export function useBaseQueryObserver<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client: QueryClient | Ref<QueryClient> | undefined,
	handlers: QueryObserverHandlers<TQueryFnData, TError, TData, TQueryKey>,
): QueryObserverHandle<TQueryFnData, TError, TData, TQueryKey> {
	const getOpts = typeof getOptions === "function" ? getOptions : () => getOptions;

	const clientRef = useQueryClient(client);
	const isRestoringRef = useIsRestoring();

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;

	const refetch: QueryObserverResult<TData, TError>["refetch"] = async (options?: RefetchOptions) =>
		observer?.refetch(options) ?? noObserverRefetch();

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		// oxlint-disable-next-line typescript/unbound-method -- requestUpdate is a pre-bound function provided by the framework context
		({ qc, isRestoring, requestUpdate }) => {
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				defaultedQueryOptions(qc, getOpts, isRestoring),
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

	// Per-render hook. The base no longer re-applies options itself — it just fires `onRender`,
	// letting each consumer opt in. Classic hooks pass `onRender: () => reArm()` (pull reactivity);
	// signal hooks omit it and react via their client effect instead.
	use(() => ({
		hostWillRender() {
			handlers.onRender?.();
		},
	}));

	const reArm = (): void => {
		const qc = clientRef.current;
		if (observer && qc) {
			observer.setOptions(defaultedQueryOptions(qc, getOpts, isRestoringRef.current));
		}
	};

	// Server only: seed the cache before render() runs. Stencil awaits all hostWillLoad
	// promises in parallel, so this does not block the observer subscription above.
	// When `onServerRender` is injected (signals layer), delegates to that (covers both held
	// and non-held, with reactive settle). Otherwise falls back to the built-in non-held prefetch
	// (classic path, unchanged behavior). The base owns abort wiring: hostDisconnected → abort().
	use(() => {
		let abort: (() => void) | undefined;
		return {
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

				if (handlers.onServerRender) {
					// Signal layer injected a settle — it handles both held and non-held.
					const r = handlers.onServerRender({ qc, getOpts, reArm, getObserver: () => observer, syncResult });
					abort = r.abort;
					return r.promise;
				}

				// Built-in non-held prefetch (classic path, unchanged).
				const initial = getOpts();
				if (initial.enabled === false || isQueryKeyHeld(initial.queryKey)) {
					return;
				}
				return qc.prefetchQuery(initial).then(syncResult);
			},
			hostDisconnected(): void {
				abort?.();
			},
		};
	});

	return { refetch, getObserver: () => observer, reArm, clientRef };
}
