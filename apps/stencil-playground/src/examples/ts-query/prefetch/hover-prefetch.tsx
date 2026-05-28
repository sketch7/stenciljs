import { SsvElement } from "@ssv/stencil-core";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { $usePrefetchQuery } from "@ssv/tanstack.stencil-query/signals";
import { Component, h } from "@stencil/core";

import { HOVER_POST_IDS, fetchHoveredPost, hoverPostQueryKey, useHoveredPost } from "./prefetch.api";

@Component({
	tag: "app-ts-query-hover-prefetch",
	styleUrl: "prefetch.css",
	shadow: true,
})
export class AppTsQueryHoverPrefetch extends SsvElement {
	readonly _signalWatcher = useSignalWatcher();
	readonly #hoveredId = signal<number | null>(null);

	readonly _hoverPrefetch = $usePrefetchQuery(() => ({
		queryKey: hoverPostQueryKey(this.#hoveredId()),
		queryFn: () => fetchHoveredPost(this.#hoveredId()),
	}));

	readonly #hoveredPost = useHoveredPost(() => this.#hoveredId());

	private handleEnter(id: number) {
		this.#hoveredId.set(id);
	}

	private handleLeave() {
		this.#hoveredId.set(null);
	}

	render() {
		const hoveredId = this.#hoveredId();
		const hoveredPost = this.#hoveredPost();

		return (
			<div class="prefetch">
				<h3 class="heading">
					Prefetch — hover signal <code>$usePrefetchQuery</code>
				</h3>
				<p class="hint">Hover an item to prefetch its detail query key via a signal-driven options getter.</p>

				<ul class="list" onMouseLeave={() => this.handleLeave()}>
					{HOVER_POST_IDS.map(id => (
						<li key={id} class="item item--hover" onMouseEnter={() => this.handleEnter(id)}>
							<span class="item-id">#{id}</span>
							<span class="item-title">Hover to prefetch post detail</span>
						</li>
					))}
				</ul>

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
		);
	}
}
