import { AppTransferState } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-1 text-2xl font-semibold">Transfer State</h1>
				<p className="text-sm text-(--color-muted)">
					Demonstrates <code>useTransferState</code> from <code>@ssv/stencil-core</code>. The server injects a{" "}
					<code>{'<script type="application/json">'}</code> tag into the page for each key; the client reads and removes
					it before the first render, avoiding a duplicate network request.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppTransferState />
			</div>

			<details className="mt-2 text-xs text-(--color-muted)">
				<summary className="cursor-pointer font-medium select-none">How it works</summary>
				<div className="mt-2 flex flex-col gap-2 pl-2">
					<p>
						Each <code>useTransferState(key, getServerValue)</code> call registers two lifecycle hooks on the host
						component:
					</p>
					<ul className="flex list-disc flex-col gap-1 pl-4">
						<li>
							<strong>Server — </strong>
							<code>hostWillRender</code>: calls <code>getServerValue()</code>, JSON-serializes the result, and injects{" "}
							<code>{'<script type="application/json" id="__ssv-state__{key}">'}</code> into <code>document.head</code>{" "}
							(once only).
						</li>
						<li>
							<strong>Client — </strong>
							<code>hostConnected</code>: finds the script by id, parses the JSON, stores the value in{" "}
							<code>ref.value</code>, and removes the tag.
						</li>
					</ul>
					<p>
						Server detection uses a two-signal check: <code>typeof window === &quot;undefined&quot;</code> (true in
						plain Node.js / Vitest) combined with <code>Build.isServer</code> from <code>@stencil/core</code> (true
						inside Stencil&apos;s hydrate bundle, where <code>const window = $stencilWindow</code> shadows the global).
					</p>
					<p>
						Three transfer keys are used here: <code>ts-demo-time</code> (string), <code>ts-demo-count</code> (number),
						and <code>ts-demo-items</code> (array). Open DevTools &rarr; Network on a reload to confirm no extra fetch
						is triggered.
					</p>
				</div>
			</details>
		</div>
	);
}
