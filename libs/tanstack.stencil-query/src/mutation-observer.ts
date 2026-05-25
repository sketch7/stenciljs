import { use, useLoadEffect } from "@ssv/stencil.core";
import { MutationObserver, notifyManager, noop } from "@tanstack/query-core";
import type { MutationObserverResult, QueryClient } from "@tanstack/query-core";

import { useQueryClient } from "./query-client-context";
import type { UseMutateAsyncFunction, UseMutateFunction, UseMutationOptions } from "./types";

/** Base mutation state shared by both hooks as the not-yet-connected value. Excludes `reset` (an action). */
export const idleMutationState = {
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

/** Actions + observer accessor shared by `useMutation` and `$useMutation`. */
export type MutationObserverHandle<TData, TError, TVariables, TContext> = {
	mutate: UseMutateFunction<TData, TError, TVariables, TContext>;
	mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables, TContext>;
	reset: () => void;
	getObserver: () => MutationObserver<TData, TError, TVariables, TContext> | undefined;
};

/**
 * Shared observer lifecycle for the classic and signals mutation hooks.
 *
 * Owns option normalization, client resolution, the `MutationObserver` subscription, and the
 * `hostWillRender → setOptions` step. `onResult` fires on each observer notification; `onDispose`
 * (optional) runs on host disconnect — the signals hook uses it to reset its source signal to idle.
 */
export function useMutationObserver<TData, TError, TVariables, TContext>(
	getOptions:
		| UseMutationOptions<TData, TError, TVariables, TContext>
		| (() => UseMutationOptions<TData, TError, TVariables, TContext>),
	client: QueryClient | undefined,
	onResult: (result: MutationObserverResult<TData, TError, TVariables, TContext>, requestUpdate: () => void) => void,
	onDispose?: () => void,
): MutationObserverHandle<TData, TError, TVariables, TContext> {
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

	const reset = (): void => {
		observer?.reset();
	};

	// hostWillLoad: context guaranteed resolved — qc is non-null and auto-unwrapped from clientRef.
	useLoadEffect(
		({ qc, requestUpdate }) => {
			observer = new MutationObserver<TData, TError, TVariables, TContext>(qc, getOpts());
			unsubscribe = observer.subscribe(
				notifyManager.batchCalls(() => {
					const r = observer?.getCurrentResult();
					if (r) {
						onResult(r, requestUpdate);
					}
				}),
			);
			return () => {
				unsubscribe?.();
				unsubscribe = undefined;
				observer?.reset();
				observer = undefined;
				onDispose?.();
			};
		},
		{ qc: clientRef },
	);

	use(() => ({
		hostWillRender() {
			if (!observer) {
				return;
			}
			// TODO(perf): skip setOptions when options is static (not a function) — mirrors Lit BaseController.onHostUpdate()
			observer.setOptions(getOpts());
		},
	}));

	return { mutate, mutateAsync, reset, getObserver: () => observer };
}
