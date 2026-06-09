import { SsvElement } from "@ssv/stencil-core";
import { usePrefetchQuery } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { postQueries, usePrefetchedPosts } from "../posts.hooks";

/**
 * Demonstrates `usePrefetchQuery` as a field initializer — seeds the cache before
 * the component's own `useQuery` runs, eliminating the initial loading state.
 *
 * @example
 * ```html
 * <app-ts-query-prefetch />
 * ```
 */
@Component({
	tag: "app-ts-query-prefetch",
	styleUrl: "prefetch.css",
	shadow: true,
})
export class AppTsQueryPrefetch extends SsvElement {
	// Seeds the cache on hostWillLoad — before useQuery subscribes.
	// TanStack deduplicates if sibling components prefetch the same key concurrently.
	readonly _ = this.setup(usePrefetchQuery(postQueries.list()));

	// Picks up the pre-seeded cache immediately — no loading flash.
	readonly #posts = usePrefetchedPosts();

	render() {
		const { data: posts, isPending, isError, error } = this.#posts();

		return (
			<div class="prefetch">
				<h3 class="heading">
					Prefetch — direct <code>usePrefetchQuery</code>
				</h3>
				<p class="hint">Cache is seeded before useQuery connects — no loading state on first render.</p>

				{isPending && <p class="status">Loading…</p>}
				{isError && <p class="status status--error">Error: {String(error)}</p>}

				{posts && (
					<ul class="list">
						{posts.map(post => (
							<li key={post.id} class="item">
								<span class="item-id">#{post.id}</span>
								<span class="item-title">{post.title}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}
}
