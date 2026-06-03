import { SsvElement } from "@ssv/stencil-core";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { $usePrefetchQuery } from "@ssv/tanstack.stencil-query/signals";
import { Component, h } from "@stencil/core";

import { postQueries, useHoveredPost } from "./prefetch.api";

const HOVER_POST_IDS = [1, 2, 3, 4, 5] as const;

@Component({
	tag: "app-ts-query-hover-prefetch",
	styleUrl: "prefetch.css",
	shadow: true,
})
export class AppTsQueryHoverPrefetch extends SsvElement {
	readonly #hoveredId = signal<number | null>(null);

	readonly _ = this.setup(() => {
		useSignalWatcher();
		$usePrefetchQuery(() => {
			const id = this.#hoveredId();
			if (!id) {
				return undefined;
			}
			return postQueries.detail(id);
		});
	});

	readonly #hoveredPost = useHoveredPost(this.#hoveredId);

	render() {
		const hoveredId = this.#hoveredId();
		const hoveredPost = this.#hoveredPost();

		return (
			<div class="prefetch">
				<h3 class="heading">
					Prefetch — hover signal <code>$usePrefetchQuery</code>
				</h3>
				<p class="hint">Hover an item to prefetch its detail query key via a signal-driven options getter.</p>

				<ul class="list" onMouseLeave={() => this.#hoveredId.set(null)}>
					{HOVER_POST_IDS.map(id => (
						<li key={id} class="item item--hover" onMouseEnter={() => this.#hoveredId.set(id)}>
							<span class="item-id">#{id}</span>
							<span class="item-title">Hover to prefetch post detail</span>
						</li>
					))}
				</ul>

				<div class="detail-area">
					{hoveredId === null && <p class="status">Hover a row to trigger prefetch.</p>}
					{hoveredId !== null && hoveredPost.isPending && <p class="status">Prefetching post #{hoveredId}…</p>}
					{hoveredPost.isError && <p class="status status--error">Error: {String(hoveredPost.error)}</p>}
					{hoveredPost.data && (
						<div class="item item--detail">
							<span class="item-id">#{hoveredPost.data.id}</span>
							<span class="item-title">{hoveredPost.data.title}</span>
						</div>
					)}
				</div>
			</div>
		);
	}
}
