import { SsvElement } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, QueryClient } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, h } from "@stencil/core";

@Component({
	tag: "app-ts-query-prefetch-demo",
	styleUrl: "prefetch.css",
	shadow: true,
})
export class AppTsQueryPrefetchDemo extends SsvElement {
	readonly #ts = provideTransferState("ts-query-prefetch");
	readonly _ = this.setup(() => {
		provideQueryClient({
			client: new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } } }),
			withHydration: this.#ts,
		});
		useQueryDevtools({ enabled: true });
	});

	render() {
		return (
			<div class="prefetch-demo">
				{this.#ts.toScriptElement()}
				<section class="prefetch-section">
					<h2 class="heading">Direct Usage</h2>
					<p class="hint">
						<code>usePrefetchQuery</code> runs in the component and seeds shared cache data before query render.
					</p>
					<app-ts-query-prefetch />
				</section>

				<section class="prefetch-section">
					<h2 class="heading">Reusable Function Pattern</h2>
					<p class="hint">
						<code>prefetchPosts()</code> is composed outside the component and re-used with the same shared client.
					</p>
					<app-ts-query-prefetch-reuse />
				</section>

				<section class="prefetch-section">
					<h2 class="heading">Hover Signal Prefetch</h2>
					<p class="hint">
						Hover updates a signal-backed key and <code>$usePrefetchQuery</code> prefetches detail entries.
					</p>
					<app-ts-query-hover-prefetch />
				</section>
			</div>
		);
	}
}
