import { createRef } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { noop } from "@tanstack/query-core";
import type { DefaultError, QueryClient } from "@tanstack/query-core";

import { idleMutationState, useMutationObserver } from "./mutation-observer";
import type { UseMutationOptions, UseMutationResult } from "./mutation-observer";

/**
 * Subscribes to a mutation and schedules a re-render whenever the mutation state changes.
 *
 * Returns the full {@link MutationObserverResult} shape plus a fire-and-forget `mutate` and
 * an async `mutateAsync` — matching react-query's `UseMutationResult` exactly.
 *
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * @example
 * ```ts
 * readonly #create = useMutation({
 *   mutationFn: (title: string) => createPost(title),
 *   onSuccess: () => this.#client.current.invalidateQueries({ queryKey: ['posts'] }),
 * });
 *
 * render() {
 *   const { isPending, isError } = this.#create();
 *   return <button disabled={isPending} onClick={() => this.#create().mutate('New Post')}>Create</button>;
 * }
 * ```
 */
export function useMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
	getOptions:
		| UseMutationOptions<TData, TError, TVariables, TContext>
		| (() => UseMutationOptions<TData, TError, TVariables, TContext>),
	client?: QueryClient | Ref<QueryClient>,
): Ref<UseMutationResult<TData, TError, TVariables, TContext>> {
	const { mutate, mutateAsync, getObserver } = useMutationObserver<TData, TError, TVariables, TContext>(
		getOptions,
		client,
		(_result, requestUpdate) => requestUpdate(),
	);

	return createRef(
		() =>
			({
				...(getObserver()?.getCurrentResult() ?? { ...idleMutationState, reset: noop }),
				mutate,
				mutateAsync,
			}) as UseMutationResult<TData, TError, TVariables, TContext>,
	);
}
