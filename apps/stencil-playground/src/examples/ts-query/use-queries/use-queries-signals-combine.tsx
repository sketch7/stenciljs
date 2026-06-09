import { SsvElement } from "@ssv/stencil-core";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { Component, h } from "@stencil/core";

import { $usePostsWithCombine } from "../posts.hooks";
import { IDS } from "./use-queries.shared";

/**
 * Component 4 — **signals with combine**. Uses `$usePostsWithCombine` which wraps `$useQueries`
 * with a `combine` function to produce a single derived summary signal. The returned signal is a
 * plain value (not a per-element proxy array).
 */
@Component({
	tag: "app-ts-query-use-queries-signals-combine",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesSignalsCombine extends SsvElement {
	readonly #ids = signal(IDS);
	readonly #summary = $usePostsWithCombine(() => this.#ids());
	readonly _ = this.setup(() => {
		useSignalWatcher();
	});

	render() {
		const { total, loaded, titles } = this.#summary();
		return (
			<div class="queries">
				<p class="summary">
					Loaded <strong>{loaded}</strong> / {total}
				</p>
				<ul class="list">
					{IDS.map((id, i) => {
						const title = titles[i];
						if (title === null) {
							return (
								<li key={id} class="item item--pending">
									<span class="item-id">#{id}</span>
									<span class="item-title">Loading…</span>
								</li>
							);
						}
						return (
							<li key={id} class="item">
								<span class="item-id">#{id}</span>
								<span class="item-title">{title}</span>
							</li>
						);
					})}
				</ul>
			</div>
		);
	}
}
