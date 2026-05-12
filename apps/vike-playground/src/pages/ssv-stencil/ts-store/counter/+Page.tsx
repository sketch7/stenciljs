import { AppTanCounter } from "@app/stencil-playground/react";
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
				<AppTanCounter />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				State is managed with <code>@tanstack/store</code> atoms via <code>createAtomCtrl</code> from{" "}
				<code>@ssv/tanstack.stenciljs-store</code>. Each atom triggers a re-render via{" "}
				<code>ReactiveControllerHost.requestUpdate()</code> — no <code>@State</code> decorators needed.
			</p>
		</div>
	);
}
