import { AppSignalsEffect } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Effect</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Increment or decrement the counter to see reactive side effects in action. History tracks every change;
					milestones fire at every multiple of 5.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsEffect />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				Two <code>effect</code> calls from <code>@ssv/stencil-signals</code> run as class property initializers. Both
				use the explicit-deps form — <code>effect(this, [count], fn, &#123; defer: true &#125;)</code> — so they only
				fire on changes, not on initial render. Passing <code>this</code> as host registers them with the
				component&apos;s watcher registry for automatic disposal on disconnect and reinitialization on reconnect.
			</p>
		</div>
	);
}
