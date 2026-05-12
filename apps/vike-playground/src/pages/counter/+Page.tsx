import { AppCounter } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Counter</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Click the buttons to change the count. Enter an additional value to see it multiplied by 2 added to the total.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppCounter />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				State is managed with <code>@stencil/store</code>. The component is server-rendered via{" "}
				<code>@stencil/ssr</code> using Declarative Shadow DOM.
			</p>
		</div>
	);
}
