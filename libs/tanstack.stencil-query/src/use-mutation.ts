import { use, createRef, useLoadEffect } from "@ssv/stencil.core";
import type { Ref } from "@ssv/stencil.core";
import { MutationObserver, notifyManager, noop } from "@tanstack/query-core";
import type { DefaultError, QueryClient } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseMutationOptions, UseMutationResult, UseMutateFunction, UseMutateAsyncFunction } from "./types";

/** State returned while the observer is not yet connected to the host. */
const idleState = {
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
	reset: noop,
};

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
	client?: QueryClient,
): Ref<UseMutationResult<TData, TError, TVariables, TContext>> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as UseMutationOptions<TData, TError, TVariables, TContext>;

	const clientRef = useQueryClient(client);

	let observer: MutationObserver<TData, TError, TVariables, TContext> | undefined;
	let unsubscribe: (() => void) | undefined;

	const mutate: UseMutateFunction<TData, TError, TVariables, TContext> = (variables, options) => {
		observer?.mutate(variables, options).catch(noop);
	};

	const mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext> = (variables, options) =>
		observer?.mutate(variables, options) ??
		Promise.reject(new Error("[ssv:query] Cannot mutate — observer not yet connected."));

	// hostWillLoad: context guaranteed resolved (clientRef.current always defined here).
	useLoadEffect(host => {
		const qc = clientRef.current;
		observer = new MutationObserver<TData, TError, TVariables, TContext>(qc, getOpts());
		unsubscribe = observer.subscribe(
			notifyManager.batchCalls(() => {
				host.requestUpdate();
			}),
		);
		return () => {
			unsubscribe?.();
			unsubscribe = undefined;
			observer?.reset();
			observer = undefined;
		};
	});

	use(() => ({
		hostWillRender() {
			if (!observer) {
				return;
			}
			observer.setOptions(getOpts());
		},
	}));

	return createRef(
		() =>
			({
				...(observer?.getCurrentResult() ?? idleState),
				mutate,
				mutateAsync,
			}) as UseMutationResult<TData, TError, TVariables, TContext>,
	);
}
