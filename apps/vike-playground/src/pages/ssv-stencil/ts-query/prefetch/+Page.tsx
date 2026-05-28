import { AppTsQueryPrefetch, AppTsQueryPrefetchReuse } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — Prefetch</h1>
				<p className="text-sm text-(--color-muted)">
					Demonstrates <code>usePrefetchQuery</code> and <code>$usePrefetchQuery</code> (signals) for eager cache
					population. Both hooks prefetch data on component connect without blocking render.
				</p>
			</div>

			<div className="space-y-6">
				<div>
					<h2 className="mb-2 text-lg font-semibold">Direct Usage</h2>
					<p className="mb-4 text-sm text-(--color-muted)">
						<code>usePrefetchQuery</code> called as a field initializer — cache is seeded immediately on{" "}
						<code>hostConnected</code>. List renders with no loading state.
					</p>
					<AppTsQueryPrefetch />
				</div>

				<div>
					<h2 className="mb-2 text-lg font-semibold">Reusable Function Pattern</h2>
					<p className="mb-4 text-sm text-(--color-muted)">
						A reusable <code>prefetchPosts()</code> function encapsulates the prefetch logic and can be called from
						multiple components. Demonstrates composition and code reuse.
					</p>
					<AppTsQueryPrefetchReuse />
				</div>
			</div>

			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>usePrefetchQuery()</code> is a Stencil hook that calls the query client's <code>prefetchQuery</code>{" "}
						method on component connect, eagerly populating the cache.
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
						A reusable function like <code>prefetchPosts()</code> can be defined outside the component and called from
						any component that needs it — enabling composition and shared prefetch logic.
					</li>
				</ul>
			</details>
		</div>
	);
}
