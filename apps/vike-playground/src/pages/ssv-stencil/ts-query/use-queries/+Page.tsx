import { AppTsQueryUseQueriesDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — useQueries</h1>
				<p className="text-sm text-(--color-muted)">
					Demonstrates <code>useQueries</code> and <code>$useQueries</code> (signals) for fetching multiple resources in
					parallel with a single subscription. All three variants share one <code>QueryClient</code>.
				</p>
			</div>

			<AppTsQueryUseQueriesDemo />

			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>useQueries(options[])</code> accepts an array of query option objects and returns a single{" "}
						<code>Ref&lt;QueryObserverResult[]&gt;</code> — one result per option, in the same order.
					</li>
					<li>
						All queries run in parallel via a <code>QueriesObserver</code>. A single subscription triggers a re-render
						whenever any result changes.
					</li>
					<li>
						Pass a getter function for reactive options: <code>useQueries(() =&gt; [...])</code>. The options are
						re-evaluated before each render so query keys can depend on props or state.
					</li>
					<li>
						The reusable hook pattern extracts <code>useQueries</code> into a plain function (e.g.{" "}
						<code>usePostAndUser()</code>) — the component only calls the hook and renders the result.
					</li>
					<li>
						<code>$useQueries</code> (signals variant) returns a <code>Signal&lt;QueryObserverResult[]&gt;</code>. Use{" "}
						<code>computed()</code> to derive fine-grained reactive values from individual results.
					</li>
				</ul>
			</details>
		</div>
	);
}
