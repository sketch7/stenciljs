import { batch, createStore } from "@ssv/stencil-signals";
import type { Store } from "@ssv/stencil-signals";
import { use, useLoadEffect } from "@ssv/stencil.core";
import { MutationObserver, notifyManager, noop } from "@tanstack/query-core";
import type { DefaultError, MutationObserverResult, QueryClient } from "@tanstack/query-core";

import { useQueryClient } from "../query-client-context";
import type { UseMutateAsyncFunction, UseMutateFunction, UseMutationOptions } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type MutationStateData<TData, TError, TVariables, TContext> = Omit<
	MutationObserverResult<TData, TError, TVariables, TContext>,
	"mutate" | "mutateAsync" | "reset"
>;

/** Return type of {@link $useMutation} — per-field signals with plain action functions. */
export type MutationSignalResult<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = Store<
	MutationStateData<TData, TError, TVariables, TContext>
> & {
	mutate: UseMutateFunction<TData, TError, TVariables, TContext>;
	mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext>;
	reset: MutationObserverResult<TData, TError, TVariables, TContext>["reset"];
};

// ─── Initial state ────────────────────────────────────────────────────────────

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

const MUTATION_STATE_KEYS = Object.keys(idleMutationState) as (keyof typeof idleMutationState)[];

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
