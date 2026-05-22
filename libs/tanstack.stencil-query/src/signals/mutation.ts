import { signal } from "@ssv/stencil-signals";
import type { DefaultError, MutationObserverResult, QueryClient } from "@tanstack/query-core";

import { idleMutationState, useMutationObserver } from "../mutation-observer";
import type { UseMutateAsyncFunction, UseMutateFunction, UseMutationOptions } from "../types";
import { createSignalResult } from "./signal-result";
import type { SignalFields } from "./signal-result";

// ─── Types ────────────────────────────────────────────────────────────────────

type MutationStateData<TData, TError, TVariables, TContext> = Omit<
	MutationObserverResult<TData, TError, TVariables, TContext>,
	"mutate" | "mutateAsync" | "reset"
>;

/** Return type of {@link $useMutation} — per-field signals with plain action functions. */
export type MutationSignalResult<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
> = SignalFields<MutationStateData<TData, TError, TVariables, TContext>> & {
	mutate: UseMutateFunction<TData, TError, TVariables, TContext>;
	mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext>;
	reset: MutationObserverResult<TData, TError, TVariables, TContext>["reset"];
};

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
	const state = signal(idleMutationState as unknown as MutationStateData<TData, TError, TVariables, TContext>);

	const { mutate, mutateAsync, reset } = useMutationObserver<TData, TError, TVariables, TContext>(
		getOptions,
		client,
		result => state.set(result),
		() => state.set(idleMutationState as unknown as MutationStateData<TData, TError, TVariables, TContext>),
	);

	return createSignalResult(state, { mutate, mutateAsync, reset });
}
