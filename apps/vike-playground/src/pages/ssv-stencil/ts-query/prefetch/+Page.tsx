import { AppTsQueryPrefetchDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — Prefetch</h1>
				<p className="text-sm text-(--color-muted)">
					Demonstrates <code>usePrefetchQuery</code> and <code>$usePrefetchQuery</code> (signals) for eager cache
					population. All examples below share one <code>QueryClient</code> and one transfer-state scope.
				</p>
			</div>

			<AppTsQueryPrefetchDemo />

			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>usePrefetchQuery()</code> is a Stencil hook that calls the query client&apos;s{" "}
						<code>prefetchQuery</code> method on component connect, eagerly populating the cache.
					</li>
					<li>
						Unlike <code>useQuery</code>, <code>usePrefetchQuery</code> does not return a reactive binding. It is
						fire-and-forget — the cache is seeded and subsequent queries reuse it.
					</li>
					<li>
						<code>$usePrefetchQuery</code> (signals variant) reactively watches the query options and re-prefetches when
						dependencies change.
					</li>
					<li>
						Both hooks use a guard: if a cache entry already exists, the prefetch is skipped. This prevents redundant
						API calls.
					</li>
					<li>
						The demo wrapper provides one shared <code>QueryClient</code>. Multiple child demos read the same cache, so
						duplicate prefetch work is skipped by query-key guards.
					</li>
					<li>
						Hovering rows in the hover demo updates a signal-backed query key and triggers{" "}
						<code>$usePrefetchQuery</code> for per-item detail prefetch.
					</li>
				</ul>
			</details>
		</div>
	);
}
