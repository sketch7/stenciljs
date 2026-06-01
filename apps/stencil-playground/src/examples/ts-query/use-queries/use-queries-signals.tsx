import { SsvElement } from "@ssv/stencil-core";
import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";
import { Component, h } from "@stencil/core";

import { $usePostsByIds } from "./use-queries.api";
import { IDS, renderSignalItem } from "./use-queries.shared";

/**
 * Component 3 — **signals**. Uses `$usePostsByIds` (defined outside the component, in
 * `use-queries.api.ts`) which wraps `$useQueries` and returns a single `Signal` of the results
 * array. Requires `useSignalWatcher()` to be active.
 */
@Component({
	tag: "app-ts-query-use-queries-signals",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesSignals extends SsvElement {
	readonly #ids = signal(IDS);
	readonly #posts = $usePostsByIds(() => this.#ids());
	readonly _ = this.setup(() => {
		useSignalWatcher();
	});

	/** Derived signal — recomputes only when the results array changes. */
	readonly #loadedCount = computed(() => this.#posts().filter(r => r.isSuccess()).length);

	render() {
		const results = this.#posts();
		return (
			<div class="queries">
				<p class="summary">
					Loaded <strong>{this.#loadedCount()}</strong> / {results.length}
				</p>
				<ul class="list">{results.map((result, i) => renderSignalItem(result, IDS[i]))}</ul>
			</div>
		);
	}
}
