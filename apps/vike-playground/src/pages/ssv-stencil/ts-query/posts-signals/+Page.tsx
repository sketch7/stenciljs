import { AppTsQueryPostsSignals } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">TanStack Query — Posts (Signals)</h1>
				<p className="text-sm text-(--color-muted)">
					Same as the Posts example but using <code>$useQuery</code> / <code>$useMutation</code> from{" "}
					<code>@ssv/tanstack.stencil-query/signals</code>. Each field (<code>isPending</code>, <code>data</code>,{" "}
					<code>isError</code>, …) is a fine-grained signal — the component re-renders only when the fields it reads
					actually change.
				</p>
			</div>
			<AppTsQueryPostsSignals />
			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it differs from useQuery</summary>
				<ul className="mt-2 ml-4 list-disc space-y-1">
					<li>
						<code>$useQuery()</code> returns a <code>Store&lt;QueryStateData&gt;</code> — fields are read directly
						without calling <code>()</code>: <code>api.posts.data</code> instead of <code>api.posts().data</code>.
					</li>
					<li>
						Each field is an independent signal. A <code>computed()</code> that only reads <code>isPending</code> does
						not re-run when <code>data</code> changes.
					</li>
					<li>
						<code>useSignalWatcher()</code> must be active in the component — it detects which signals were read during
						the last render and schedules re-renders when they change.
					</li>
					<li>
						<code>$useMutation()</code> exposes <code>mutate</code>, <code>mutateAsync</code>, and <code>reset</code> as
						plain functions alongside the signal fields.
					</li>
				</ul>
			</details>
		</div>
	);
}
