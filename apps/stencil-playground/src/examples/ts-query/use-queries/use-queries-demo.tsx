import { SsvElement } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, useQueryHydration } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, h } from "@stencil/core";

/**
 * Host component for the `useQueries` demo.
 *
 * Provides a shared `QueryClient` and renders three variants side-by-side:
 * - Inline usage (options in the field initializer)
 * - Reusable hook pattern (options extracted into a helper)
 * - Signals variant (`$useQueries`)
 *
 * @example
 * ```html
 * <app-ts-query-use-queries-demo />
 * ```
 */
@Component({
	tag: "app-ts-query-use-queries-demo",
	styleUrl: "use-queries.css",
	shadow: true,
})
export class AppTsQueryUseQueriesDemo extends SsvElement {
	readonly _ = this.setup(() => {
		provideTransferState("ts-query-use-queries");
		provideQueryClient();
		useQueryHydration();
		useQueryDevtools({ enabled: true });
	});

	render() {
		return (
			<div class="use-queries-demo">
				<section class="section">
					<h2 class="heading">Inline Usage</h2>
					<p class="hint">
						Query options are defined directly in the class — the simplest way to fetch multiple resources at once.
					</p>
					<app-ts-query-use-queries-inline />
				</section>

				<section class="section">
					<h2 class="heading">Reusable Hook Pattern</h2>
					<p class="hint">
						<code>usePostAndUser()</code> encapsulates <code>useQueries</code> so the component only renders the result.
					</p>
					<app-ts-query-use-queries-reuse />
				</section>

				<section class="section">
					<h2 class="heading">Signals Variant</h2>
					<p class="hint">
						<code>$useQueries</code> returns a <code>Signal</code> — combine with <code>computed()</code> for
						fine-grained reactive derived state.
					</p>
					<app-ts-query-use-queries-signals />
				</section>
			</div>
		);
	}
}
