import { SsvElement } from "@ssv/stencil-core";
import { Component, h } from "@stencil/core";

import { prefetchPosts, usePrefetchedPosts } from "./prefetch.api";
import type { Post } from "./prefetch.api";

/**
 * Demonstrates `prefetchPosts` — a reusable prefetch function defined outside the
 * component and called as a field initializer. The function is fully composable and
 * can be shared across multiple components.
 *
 * @example
 * ```html
 * <app-ts-query-prefetch-reuse />
 * ```
 */
@Component({
	tag: "app-ts-query-prefetch-reuse",
	styleUrl: "prefetch.css",
	shadow: true,
})
export class AppTsQueryPrefetchReuse extends SsvElement {
	// `prefetchPosts` is defined in prefetch.api.ts — outside this component.
	// Calling it here wires the prefetch controller onto this host via `use()`.
	readonly _ = this.setup(prefetchPosts());

	// Same query as Component 1 — hits the pre-seeded cache.
	readonly #posts = usePrefetchedPosts();

	render() {
		const { data: posts, isPending, isError, error } = this.#posts();

		return (
			<div class="prefetch">
				<h3 class="heading">
					Prefetch — reusable <code>prefetchPosts()</code>
				</h3>
				<p class="hint">
					The prefetch function is defined outside the component and composed in as a field initializer.
				</p>

				{isPending && <p class="status">Loading…</p>}
				{isError && <p class="status status--error">Error: {String(error)}</p>}

				{posts && (
					<ul class="list">
						{posts.map((post: Post) => (
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
