import { SsvElement } from "@ssv/stencil-core";
import { useQueries } from "@ssv/tanstack.stencil-query";
import type { QueryObserverResult } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { postQueries, userQueries } from "./use-queries.api";
import type { Post, User } from "./use-queries.api";

/**
 * Demonstrates `useQueries` used inline — query options are defined directly in the class,
 * showing the simplest way to fetch multiple resources in parallel.
 *
 * @example
 * ```html
 * <app-ts-query-use-queries-inline />
 * ```
 */
@Component({
	tag: "app-ts-query-use-queries-inline",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesInline extends SsvElement {
	// Both queries run in parallel — no nesting required.
	readonly #results = useQueries([postQueries.detail(1), userQueries.detail(1)]);

	private renderStatus(result: QueryObserverResult | undefined) {
		const cls = `badge badge--${result?.isPending ? "pending" : result?.isError ? "error" : "success"}`;
		return <span class={cls}>{result?.isPending ? "loading…" : result?.isError ? "error" : "ready"}</span>;
	}

	render() {
		const [postResult, userResult] = this.#results();
		const post = postResult as QueryObserverResult<Post>;
		const user = userResult as QueryObserverResult<User>;

		return (
			<div class="use-queries">
				<h3 class="heading">
					Inline <code>useQueries</code>
				</h3>
				<p class="hint">Both queries run in parallel. Options are defined inline — no helper hook required.</p>

				<div class="results">
					<div class="result-card">
						<div class="result-card__label">Post {this.renderStatus(post)}</div>
						{post?.data && (
							<div>
								<p class="result-card__title">{post.data.title}</p>
								<p class="result-card__detail">id: {post.data.id}</p>
							</div>
						)}
						{post?.isError && <p class="status status--error">{String(post.error)}</p>}
					</div>

					<div class="result-card">
						<div class="result-card__label">User {this.renderStatus(user)}</div>
						{user?.data && (
							<div>
								<p class="result-card__title">{user.data.name}</p>
								<p class="result-card__detail">{user.data.email}</p>
							</div>
						)}
						{user?.isError && <p class="status status--error">{String(user.error)}</p>}
					</div>
				</div>
			</div>
		);
	}
}
