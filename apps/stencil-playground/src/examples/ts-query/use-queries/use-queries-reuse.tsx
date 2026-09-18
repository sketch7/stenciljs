import { SsvElement } from "@ssv/stencil-core";
import { Component, h } from "@stencil/core";

import { usePostsByIds, usePostsLoadedCount } from "../posts.hooks";
import { IDS, renderItem } from "./use-queries.shared";

/**
 * Component 2 — **classic, reusable across files**. Uses `usePostsByIds` and `usePostsLoadedCount`,
 * which are defined OUTSIDE this component in `use-queries.api.ts` and composed in as field
 * initializers. `usePostsLoadedCount` uses `combine` to derive a single summary value.
 */
@Component({
	tag: "app-ts-query-use-queries-reuse",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesReuse extends SsvElement {
	// Both hooks are defined outside the component — see use-queries.api.ts.
	readonly #posts = usePostsByIds(() => IDS);
	readonly #summary = usePostsLoadedCount(() => IDS);

	render() {
		const results = this.#posts();
		const { loaded, total, pending } = this.#summary();
		return (
			<div class="queries">
				<p class="summary">
					Loaded <strong>{loaded}</strong> / {total}
					{pending ? " — still fetching…" : " — all done."}
				</p>
				<ul class="list">{results.map((result, i) => renderItem(result, IDS[i]))}</ul>
			</div>
		);
	}
}
