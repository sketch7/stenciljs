import type { UseQueryResult } from "@ssv/tanstack.stencil-query";
import type { QuerySignalResult } from "@ssv/tanstack.stencil-query/signals";
import { h } from "@stencil/core";

import type { Post } from "./use-queries.api";

/** The post ids fetched in parallel across all `useQueries` examples. */
export const IDS = [1, 2, 3];

/** Renders a single query result item — loading / error / data. Shared across the examples. */
export function renderItem(result: UseQueryResult<Post>, id: number) {
	if (result.isPending) {
		return (
			<li key={id} class="item item--pending">
				<span class="item-id">#{id}</span>
				<span class="item-title">Loading…</span>
			</li>
		);
	}
	if (result.isError) {
		return (
			<li key={id} class="item item--error">
				<span class="item-id">#{id}</span>
				<span class="item-title">Error: {String(result.error)}</span>
			</li>
		);
	}
	return (
		<li key={id} class="item">
			<span class="item-id">#{result.data?.id}</span>
			<span class="item-title">{result.data?.title}</span>
		</li>
	);
}

/** Renders a single **signal** query result item — reads fields as signal functions. */
export function renderSignalItem(result: QuerySignalResult<Post>, id: number) {
	if (result.isPending()) {
		return (
			<li key={id} class="item item--pending">
				<span class="item-id">#{id}</span>
				<span class="item-title">Loading…</span>
			</li>
		);
	}
	if (result.isError()) {
		return (
			<li key={id} class="item item--error">
				<span class="item-id">#{id}</span>
				<span class="item-title">Error: {String(result.error())}</span>
			</li>
		);
	}
	return (
		<li key={id} class="item">
			<span class="item-id">#{result.data()?.id}</span>
			<span class="item-title">{result.data()?.title}</span>
		</li>
	);
}
