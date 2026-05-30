import { SsvElement } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, QueryClient, useQueryHydration } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, h } from "@stencil/core";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Demo wrapper — provides a shared `QueryClient` and SSR hydration, then embeds the three
 * `useQueries` / `$useQueries` examples.
 */
@Component({
	tag: "app-ts-query-use-queries-demo",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesDemo extends SsvElement {
	readonly _ = this.setup(() => {
		provideTransferState("ts-query-use-queries");
		provideQueryClient(new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME } } }));
		useQueryHydration();
		useQueryDevtools({ enabled: true });
	});

	render() {
		return (
			<div class="use-queries-demo">
				<section class="section">
					<h2 class="heading">Inline — useQueries</h2>
					<p class="hint">
						<code>useQueries</code> runs one query per id in parallel and returns the results array. The query list is
						built by a reusable function defined in the same file.
					</p>
					<app-ts-query-use-queries-inline />
				</section>

				<section class="section">
					<h2 class="heading">Reusable function — usePostsByIds + combine</h2>
					<p class="hint">
						<code>usePostsByIds()</code> and <code>usePostsLoadedCount()</code> are defined outside the component and
						composed in. The latter uses <code>combine</code> to derive a single summary value.
					</p>
					<app-ts-query-use-queries-reuse />
				</section>

				<section class="section">
					<h2 class="heading">Signals — $useQueries</h2>
					<p class="hint">
						<code>$useQueries</code> returns a single <code>Signal</code> of the results array; derived state is a{" "}
						<code>computed()</code>.
					</p>
					<app-ts-query-use-queries-signals />
				</section>
			</div>
		);
	}
}
