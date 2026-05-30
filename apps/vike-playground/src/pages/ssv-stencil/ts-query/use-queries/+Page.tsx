import { AppTsQueryUseQueriesDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — useQueries</h1>
				<p className="text-sm text-(--color-muted)">
					Runs a dynamic list of queries in parallel with <code>useQueries</code> and <code>$useQueries</code>{" "}
					(signals). All examples below share one <code>QueryClient</code> and one transfer-state scope.
				</p>
			</div>

			<AppTsQueryUseQueriesDemo />

			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>useQueries({"{ queries: [...] }"})</code> subscribes to a list of queries in parallel and returns the
						results array — each element is a full <code>UseQueryResult</code>.
					</li>
					<li>
						Pass a <strong>getter function</strong> for a reactive query list (e.g. when the ids depend on a{" "}
						<code>@Prop</code> or signal).
					</li>
					<li>
						<code>combine</code> derives a single value from all results and narrows the return type — used here to
						compute the loaded/total summary.
					</li>
					<li>
						The <em>reusable function</em> example composes <code>usePostsByIds()</code> defined outside the component,
						showing the hook drops into any component&apos;s class body.
					</li>
					<li>
						<code>$useQueries</code> is the signals counterpart — it returns a single <code>Signal</code> of the results
						array (mirrors angular&apos;s <code>injectQueries</code>) and requires <code>useSignalWatcher()</code>.
					</li>
				</ul>
			</details>
		</div>
	);
}
