import type { QueryObserverResult } from "@ssv/tanstack.stencil-query";
import { h } from "@stencil/core";

/**
 * Renders a status badge for a query result.
 * Shared across the `useQueries` demo components.
 */
export function renderQueryStatus(result: QueryObserverResult | undefined) {
	const status = result?.isPending ? "pending" : result?.isError ? "error" : "success";
	const label = status === "pending" ? "loading…" : status;
	return <span class={`badge badge--${status}`}>{label}</span>;
}
