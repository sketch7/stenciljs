import { batch, createStore } from "@ssv/stencil-signals";
import type { Store } from "@ssv/stencil-signals";
import { use, useLoadEffect } from "@ssv/stencil.core";
import { MutationObserver, QueryObserver, notifyManager, noop } from "@tanstack/query-core";
import type {
	DefaultError,
	MutationObserverResult,
	NoInfer,
	QueryClient,
	QueryKey,
	QueryObserverResult,
} from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type {
	DefinedInitialDataOptions,
	UseMutateAsyncFunction,
	UseMutateFunction,
	UseMutationOptions,
	UseQueryOptions,
} from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type QueryStateData<TData, TError> = Omit<QueryObserverResult<TData, TError>, "refetch">;

type MutationStateData<TData, TError, TVariables, TContext> = Omit<
	MutationObserverResult<TData, TError, TVariables, TContext>,
	"mutate" | "mutateAsync" | "reset"
>;

/** Return type of {@link $useQuery} — per-field signals with a plain `refetch`. */
export type QuerySignalResult<TData = unknown, TError = DefaultError> = Store<QueryStateData<TData, TError>> & {
	refetch: QueryObserverResult<TData, TError>["refetch"];
};

/** Return type of {@link $useMutation} — per-field signals with plain action functions. */
export type MutationSignalResult<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = Store<
	MutationStateData<TData, TError, TVariables, TContext>
> & {
	mutate: UseMutateFunction<TData, TError, TVariables, TContext>;
	mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext>;
	reset: MutationObserverResult<TData, TError, TVariables, TContext>["reset"];
};

// ─── Initial state ────────────────────────────────────────────────────────────

/** State returned while the query observer is not yet connected. */
const pendingQueryState = {
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

/** State returned while the mutation observer is not yet connected. */
const idleMutationState = {
	data: undefined,
	variables: undefined,
	context: undefined,
	isIdle: true,
	isPending: false,
	isSuccess: false,
	isError: false,
	isPaused: false,
	status: "idle" as const,
	error: null,
	failureReason: null,
	failureCount: 0,
	submittedAt: 0,
};

const QUERY_STATE_KEYS = Object.keys(pendingQueryState) as (keyof typeof pendingQueryState)[];
const MUTATION_STATE_KEYS = Object.keys(idleMutationState) as (keyof typeof idleMutationState)[];

const noObserverRefetch = (): Promise<never> =>
	Promise.reject(new Error("[ssv:query] Cannot refetch — observer not yet connected."));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapWithExtra<TStore extends object, TExtra extends object>(store: TStore, extra: TExtra): TStore & TExtra {
	const extraKeys = new Set(Object.keys(extra));
	return new Proxy(store, {
		get(target, prop, receiver) {
			if (typeof prop === "string" && extraKeys.has(prop)) {
				return (extra as Record<string, unknown>)[prop];
			}
			return Reflect.get(target, prop, receiver);
		},
		set(target, prop, value, receiver) {
			if (typeof prop === "string" && extraKeys.has(prop)) {
				return true; // plain extra properties are managed by closures
			}
			return Reflect.set(target, prop, value, receiver);
		},
	}) as TStore & TExtra;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Subscribes to a query and exposes the result as per-field signals.
 *
 * Each field (`isPending`, `data`, `isError`, …) is a signal — reads inside `render()` or
 * `computed()` are tracked individually. Requires `useSignalWatcher()` to be active.
 *
 * Pass a **getter function** for reactive options (e.g. when `queryKey` depends on a signal).
 *
 * @example
 * ```ts
 * readonly #posts = $useQuery(() => ({
 *   queryKey: ['posts'],
 *   queryFn: fetchPosts,
 * }));
 *
 * render() {
 *   const posts = this.#posts.data();
 *   const isPending = this.#posts.isPending();
 * }
 * ```
 *
 * @example
 * ```ts
 * // Reactive options — signal read captured in closure
 * readonly #user = $useQuery(() => {
 *   const userId = this.#userId();
 *   return {
 *     queryKey: ['user', userId] as const,
 *     queryFn: () => fetchUser(userId),
 *   };
 * });
 * ```
 *
 * @example
 * ```ts
 * // Fine-grained derived signal
 * readonly #isLoading = computed(() => this.#user.isPending() || this.#user.isFetching());
 * ```
 */
export function $useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient,
): QuerySignalResult<NoInfer<TData>, TError>;

export function $useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient,
): QuerySignalResult<NoInfer<TData>, TError>;

export function $useQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	getOptions:
		| UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
		| (() => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>),
	client?: QueryClient,
): QuerySignalResult<TData, TError> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

	const clientRef = useQueryClient(client);

	const store = createStore(pendingQueryState as unknown as QueryStateData<TData, TError>);
	let refetchFn: QueryObserverResult<TData, TError>["refetch"] = noObserverRefetch;

	const result = wrapWithExtra(store, {
		get refetch() {
			return refetchFn;
		},
	}) as QuerySignalResult<TData, TError>;

	// Hoisted so both hostWillRender and the subscription callback can use it.
	const syncResult = (r: QueryObserverResult<TData, TError>): void => {
		batch(() => {
			for (const key of QUERY_STATE_KEYS) {
				store.$signal(key).set(r[key as keyof typeof r] as QueryStateData<TData, TError>[typeof key]);
			}
		});
		refetchFn = r.refetch;
	};

	let observer: QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;

	useLoadEffect(
		({ qc }) => {
			observer = new QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>(
				qc,
				qc.defaultQueryOptions(getOpts()),
			);

			// Sync immediately in case data is already cached.
			syncResult(observer.getCurrentResult());

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					const r = observer?.getCurrentResult();
					if (r) {
						syncResult(r);
					}
				}),
			);

			return () => {
				unsubscribe();
				observer?.destroy();
				observer = undefined;
			};
		},
		{ qc: clientRef },
	);

	use(() => ({
		hostWillRender(): void {
			const qc = clientRef.current;
			if (!observer || !qc) {
				return;
			}
			observer.setOptions(qc.defaultQueryOptions(getOpts()));
			// Sync latest result before each render — mirrors useQuery's lazy Ref read.
			// Ensures SSR/hydration sees the cached data even if the subscription
			// callback was batched as a microtask and not yet flushed.
			syncResult(observer.getCurrentResult());
		},
	}));

	return result;
}

/**
 * Subscribes to a mutation and exposes the result as per-field signals.
 *
 * Each field (`isPending`, `isSuccess`, `data`, …) is a signal — reads inside `render()` or
 * `computed()` are tracked individually. Requires `useSignalWatcher()` to be active.
 *
 * @example
 * ```ts
 * readonly #create = $useMutation({
 *   mutationFn: (title: string) => apiCreatePost(title),
 * });
 *
 * render() {
 *   const isPending = this.#create.isPending();
 *   return <button disabled={isPending} onClick={() => this.#create.mutate('New')}>Create</button>;
 * }
 * ```
 */
export function $useMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
	getOptions:
		| UseMutationOptions<TData, TError, TVariables, TContext>
		| (() => UseMutationOptions<TData, TError, TVariables, TContext>),
	client?: QueryClient,
): MutationSignalResult<TData, TError, TVariables, TContext> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as UseMutationOptions<TData, TError, TVariables, TContext>;

	const clientRef = useQueryClient(client);

	const store = createStore(idleMutationState as unknown as MutationStateData<TData, TError, TVariables, TContext>);

	let observer: MutationObserver<TData, TError, TVariables, TContext> | undefined;

	const mutate: UseMutateFunction<TData, TError, TVariables, TContext> = (variables, options) => {
		observer?.mutate(variables, options).catch(noop);
	};

	const mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext> = (variables, options) =>
		observer?.mutate(variables, options) ??
		Promise.reject(new Error("[ssv:query] Cannot mutate — observer not yet connected."));

	const result = wrapWithExtra(store, {
		mutate,
		mutateAsync,
		get reset() {
			return () => observer?.reset();
		},
	}) as MutationSignalResult<TData, TError, TVariables, TContext>;

	useLoadEffect(
		({ qc }) => {
			observer = new MutationObserver<TData, TError, TVariables, TContext>(qc, getOpts());

			const unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					const r = observer?.getCurrentResult();
					if (!r) {
						return;
					}
					batch(() => {
						for (const key of MUTATION_STATE_KEYS) {
							store
								.$signal(key)
								.set(r[key as keyof typeof r] as MutationStateData<TData, TError, TVariables, TContext>[typeof key]);
						}
					});
				}),
			);

			return () => {
				unsubscribe?.();
				observer?.reset();
				observer = undefined;
			};
		},
		{ qc: clientRef },
	);

	use(() => ({
		hostWillRender(): void {
			if (!observer) {
				return;
			}
			observer.setOptions(getOpts());
		},
	}));

	return result;
}
