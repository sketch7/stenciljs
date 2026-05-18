import { AppTsQueryPosts } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — Posts</h1>
				<p className="text-sm text-(--color-muted)">
					Fetches from JSONPlaceholder via <code>useQuery</code>. Create a post with <code>useMutation</code> — on
					success the list is invalidated and refetched automatically.
				</p>
			</div>
			<AppTsQueryPosts />
			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>provideQueryClient()</code> creates and provides a <code>QueryClient</code> to all descendants via
						DOM-event context.
					</li>
					<li>
						<code>usePosts()</code> is a unified custom hook: it calls <code>useQueryClient()</code>,{" "}
						<code>useQuery()</code>, and <code>useMutation()</code> — the component only renders.
					</li>
					<li>
						<code>{"provideQueryClient({ ssrKey })"}</code> automatically dehydrates on the server and hydrates on the
						client via a <code>&lt;script type="application/json"&gt;</code> tag — no re-fetch on initial load.
					</li>
				</ul>
			</details>
		</div>
	);
}
