import { use } from "@ssv/stencil.core";
import { MutationObserver, notifyManager, noop } from "@tanstack/query-core";
import type {
	DefaultError,
	MutateOptions,
	MutationObserverOptions,
	MutationObserverResult,
	QueryClient,
} from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseMutationResult } from "./types";

/**
 * Subscribes to a mutation and schedules a re-render whenever the mutation state changes.
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
 *   const { isPending } = this.#create;
 *   return <button disabled={isPending} onClick={() => this.#create.mutate('New Post')}>Create</button>;
 * }
 * ```
 */
export function useMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
	getOptions:
		| MutationObserverOptions<TData, TError, TVariables, TContext>
		| (() => MutationObserverOptions<TData, TError, TVariables, TContext>),
	client?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TContext> {
	const getOpts =
		typeof getOptions === "function"
			? getOptions
			: () => getOptions as MutationObserverOptions<TData, TError, TVariables, TContext>;

	const clientRef = useQueryClient(client);

	let observer: MutationObserver<TData, TError, TVariables, TContext> | undefined;
	let result: MutationObserverResult<TData, TError, TVariables, TContext> | null = null;
	let unsubscribe: (() => void) | undefined;

	const mutationRef: UseMutationResult<TData, TError, TVariables, TContext> = {
		get data() {
			return result?.data;
		},
		get isPending() {
			return result?.isPending ?? false;
		},
		get isSuccess() {
			return result?.isSuccess ?? false;
		},
		get isError() {
			return result?.isError ?? false;
		},
		get error() {
			return result?.error ?? null;
		},
		get isIdle() {
			return result?.isIdle ?? true;
		},
		get variables() {
			return result?.variables;
		},
		get status() {
			return result?.status ?? "idle";
		},
		mutate(variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>) {
			observer?.mutate(variables, options).catch(noop);
		},
		mutateAsync(variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>) {
			return (
				observer?.mutate(variables, options) ??
				Promise.reject(new Error("[ssv:query] Cannot mutate — no QueryClient is available."))
			);
		},
		reset() {
			observer?.reset();
		},
	};

	use(host => ({
		hostConnected() {
			const qc = clientRef.current;
			observer = new MutationObserver<TData, TError, TVariables, TContext>(qc, getOpts());
			result = observer.getCurrentResult();

			unsubscribe = observer.subscribe(
				notifyManager.batchCalls((nextResult: MutationObserverResult<TData, TError, TVariables, TContext>) => {
					result = nextResult;
					host.requestUpdate();
				}),
			);
		},
		hostWillRender() {
			if (!observer) {
				return;
			}
			observer.setOptions(getOpts());
			result = observer.getCurrentResult();
		},
		hostDisconnected() {
			unsubscribe?.();
			unsubscribe = undefined;
			observer?.reset();
			observer = undefined;
			result = null;
		},
	}));

	return mutationRef;
}
