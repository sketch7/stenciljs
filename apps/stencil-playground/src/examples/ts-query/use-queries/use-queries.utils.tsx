import type { QueryObserverResult } from "@ssv/tanstack.stencil-query";
import { h } from "@stencil/core";

/**
 * Renders a status badge for a query result.
 * Shared across the `useQueries` demo components.
 */
export function renderQueryStatus(result: QueryObserverResult | undefined) {
	const cls = `badge badge--${result?.isPending ? "pending" : result?.isError ? "error" : "success"}`;
	return <span class={cls}>{result?.isPending ? "loading…" : result?.isError ? "error" : "ready"}</span>;
}
