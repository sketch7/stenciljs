import { SsvElement } from "@ssv/stencil-core";
import { computed, useSignalWatcher } from "@ssv/stencil-signals";
import type { QueryObserverResult } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { $usePostAndUser } from "./use-queries.api";
import type { Post, User } from "./use-queries.api";
import { renderQueryStatus } from "./use-queries.utils";

/**
 * Demonstrates `$useQueries` — the signals-based variant.
 *
 * Results are a single reactive signal. A derived `computed` signal tracks whether
 * all queries are resolved, enabling fine-grained updates without full re-renders.
 *
 * @example
 * ```html
 * <app-ts-query-use-queries-signals />
 * ```
 */
@Component({
	tag: "app-ts-query-use-queries-signals",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesSignals extends SsvElement {
	readonly _ = this.setup(() => {
		useSignalWatcher();
	});

	// $useQueries returns a Signal<QueryObserverResult[]>
	readonly #results = $usePostAndUser(3, 3);

	/** Derived signal — true when every query has settled (success or error). */
	readonly #allSettled = computed(() => this.#results().every(r => !r.isPending));

	render() {
		const [postResult, userResult] = this.#results();
		const post = postResult as QueryObserverResult<Post>;
		const user = userResult as QueryObserverResult<User>;

		return (
			<div class="use-queries">
				<h3 class="heading">
					Signals — <code>$useQueries</code>
				</h3>
				<p class="hint">
					Results arrive as a single <code>Signal&lt;QueryObserverResult[]&gt;</code>. A <code>computed()</code> drives
					the settled badge.{this.#allSettled() ? " ✓ All settled." : " ⏳ Fetching…"}
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
