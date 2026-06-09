// oxlint-disable @typescript-eslint/no-explicit-any -- mirrors TanStack `useQueries` variadic generic signature; `any` is required for per-element type inference
import { createRef } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import type { QueryClient } from "@tanstack/query-core";

import { useBaseQueriesObserver } from "./queries-observer";
import type { QueriesResults, UseQueriesOptions } from "./queries-observer";

/**
 * Subscribes to a list of queries in parallel and schedules a re-render whenever any result changes.
 *
 * The TanStack-Query analogue of react-query's `useQueries` / angular's `injectQueries`. Returns a
 * {@link Ref} whose value is the **tuple of results** (one {@link import("./query-observer").UseQueryResult}
 * per query), with each element's `data`/`error` types preserved.
 *
 * Pass a **getter function** for reactive options (e.g. when the query list depends on a `@Prop`).
 * Pass an explicit `client` to bypass context — useful in unit tests.
 *
 * Provide `combine` to derive a single value from all results; the return type narrows accordingly.
 *
 * @example
 * ```ts
 * readonly #posts = useQueries(() => ({
 *   queries: this.ids.map(id => ({ queryKey: ['post', id], queryFn: () => fetchPost(id) })),
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
 * readonly #total = useQueries({
 *   queries: [a, b, c],
 *   combine: results => results.reduce((sum, r) => sum + (r.data ?? 0), 0),
 * });
 * ```
 */
export function useQueries<T extends any[], TCombinedResult = QueriesResults<T>>(
	getOptions: UseQueriesOptions<T, TCombinedResult> | (() => UseQueriesOptions<T, TCombinedResult>),
	client?: QueryClient | Ref<QueryClient>,
): Ref<TCombinedResult> {
	const handle = useBaseQueriesObserver<TCombinedResult>(getOptions as never, client, {
		onResult: (_result, requestUpdate) => requestUpdate(),
		onRender: () => handle.reArm(),
	});

	return createRef(() => handle.getCurrentResult());
}
