import { SsvElement } from "@ssv/stencil-core";
import type { QueryObserverResult } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { usePostAndUser } from "./use-queries.api";
import type { Post, User } from "./use-queries.api";
import { renderQueryStatus } from "./use-queries.utils";

/**
 * Demonstrates `useQueries` via a reusable hook — the `usePostAndUser` helper
 * encapsulates query options so the component only renders.
 *
 * @example
 * ```html
 * <app-ts-query-use-queries-reuse />
 * ```
 */
@Component({
	tag: "app-ts-query-use-queries-reuse",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesReuse extends SsvElement {
	// The reusable hook abstracts the query options — the component only needs the result.
	// No explicit client → resolves via context from the parent demo host.
	readonly #results = usePostAndUser(1, 1);

	render() {
		const [postResult, userResult] = this.#results();
		const post = postResult as QueryObserverResult<Post>;
		const user = userResult as QueryObserverResult<User>;

		return (
			<div class="use-queries">
				<h3 class="heading">
					Reusable <code>usePostAndUser</code> hook
				</h3>
				<p class="hint">
					<code>usePostAndUser(postId, userId)</code> wraps <code>useQueries</code> — the component only renders the
					result.
				</p>

				<div class="results">
					<div class="result-card">
						<div class="result-card__label">Post {renderQueryStatus(post)}</div>
						{post?.data && (
							<div>
								<p class="result-card__title">{post.data.title}</p>
								<p class="result-card__detail">id: {post.data.id}</p>
							</div>
						)}
						{post?.isError && <p class="status status--error">{String(post.error)}</p>}
					</div>

					<div class="result-card">
						<div class="result-card__label">User {renderQueryStatus(user)}</div>
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
