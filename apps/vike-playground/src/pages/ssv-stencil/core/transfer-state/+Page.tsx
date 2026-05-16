import { AppTransferState } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold mb-1">Transfer State</h1>
				<p className="text-sm text-[var(--color-muted)]">
					Demonstrates <code>useTransferState</code> from <code>@ssv/stencil.core</code>. The server injects a{" "}
					<code>{'<script type="application/json">'}</code> tag into the page for each key; the client reads and removes
					it before the first render, avoiding a duplicate network request.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppTransferState />
			</div>

			<details className="text-xs text-[var(--color-muted)] mt-2">
				<summary className="cursor-pointer select-none font-medium">How it works</summary>
				<div className="mt-2 flex flex-col gap-2 pl-2">
					<p>
						Each <code>useTransferState(key, getServerValue)</code> call registers two lifecycle hooks on the host
						component:
					</p>
					<ul className="list-disc pl-4 flex flex-col gap-1">
						<li>
							<strong>Server — </strong>
							<code>hostWillRender</code>: calls <code>getServerValue()</code>, JSON-serializes the result, and injects{" "}
							<code>{'<script type="application/json" id="ssv-ts-{key}">'}</code> into <code>document.head</code> (once
							only).
						</li>
						<li>
							<strong>Client — </strong>
							<code>hostConnected</code>: finds the script by id, parses the JSON, stores the value in{" "}
							<code>ref.value</code>, and removes the tag.
						</li>
					</ul>
					<p>
						Server detection uses a two-signal check: <code>{'typeof window === "undefined"'}</code> (true in plain
						Node.js / Vitest) combined with <code>Build.isServer</code> from <code>@stencil/core</code> (true inside
						Stencil&apos;s hydrate bundle, where <code>const window = $stencilWindow</code> shadows the global).
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
