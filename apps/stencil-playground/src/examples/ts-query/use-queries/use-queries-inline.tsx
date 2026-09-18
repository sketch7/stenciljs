import { SsvElement } from "@ssv/stencil-core";
import { useQueries } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { postQueries } from "../posts.hooks";
import { IDS, renderItem } from "./use-queries.shared";

/**
 * Reusable function defined OUTSIDE the component (in this same file) and used INSIDE it.
 *
 * `useQueries` captures the host through its controller, so composing it inside a plain function
 * and calling that function as a field initializer wires the lifecycle onto whatever component
 * uses it — demonstrating the feature's reusability.
 */
function useTopPosts() {
	return useQueries(() => ({
		queries: IDS.map(id => postQueries.detail(id)),
	}));
}

/**
 * Component 1 — **classic**. Uses the same-file `useTopPosts()` helper and renders the parallel
 * results array returned by `useQueries`.
 */
@Component({
	tag: "app-ts-query-use-queries-inline",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesInline extends SsvElement {
	// `useTopPosts` is defined above — outside the component — and used here inside it.
	readonly #posts = useTopPosts();

	render() {
		const results = this.#posts();
		return (
			<div class="queries">
				<ul class="list">{results.map((result, i) => renderItem(result, IDS[i]))}</ul>
			</div>
		);
	}
}
