// oxlint-disable @typescript-eslint/no-explicit-any -- mirrors TanStack `useQueries` variadic generic signature; `any` is required for per-element type inference
import type { Ref } from "@ssv/stencil-core";
import { signal } from "@ssv/stencil-signals";
import type { Signal } from "@ssv/stencil-signals";
import type { QueryClient } from "@tanstack/query-core";

import { pendingQueriesResult, useBaseQueriesObserver } from "../queries-observer";
import type { QueriesResults, UseQueriesOptions } from "../queries-observer";

/**
 * Subscribes to a list of queries in parallel and exposes the combined result as a single signal.
 *
 * The signals counterpart of {@link import("../use-queries").useQueries}, mirroring angular's
 * `injectQueries` which also returns a single `Signal` of the results array. Reads inside `render()`
 * or `computed()` are tracked. Requires `useSignalWatcher()` to be active.
 *
 * Pass a **getter function** for reactive options (e.g. when the query list depends on a signal).
 * Provide `combine` to derive a single value from all results; the signal's type narrows accordingly.
 *
 * @example
 * ```ts
 * readonly #posts = \$useQueries(() => ({
 *   queries: this.ids().map(id => ({ queryKey: ['post', id], queryFn: () => fetchPost(id) })),
 * }));
 *
 * render() {
 *   const results = this.#posts();
 *   const allLoaded = results.every(r => r.isSuccess);
 * }
 * ```
 *
 * @example
 * ```ts
 * // combine — derive a single value
 * readonly #total = \$useQueries({
 *   queries: [a, b, c],
 *   combine: results => results.reduce((sum, r) => sum + (r.data ?? 0), 0),
 * });
 * ```
 */
export function $useQueries<T extends any[], TCombinedResult = QueriesResults<T>>(
	getOptions: UseQueriesOptions<T, TCombinedResult> | (() => UseQueriesOptions<T, TCombinedResult>),
	client?: QueryClient | Ref<QueryClient>,
): Signal<TCombinedResult> {
	const getOpts = (typeof getOptions === "function" ? getOptions : () => getOptions) as () => never;
	const state = signal<TCombinedResult>(pendingQueriesResult<TCombinedResult>(getOpts()));

	useBaseQueriesObserver<TCombinedResult>(getOptions as never, client, {
		onResult: result => state.set(result),
		onConnect: result => state.set(result),
		onRender: result => state.set(result),
		onDispose: () => state.set(pendingQueriesResult<TCombinedResult>(getOpts())),
	});

	return state.asReadonly();
}
