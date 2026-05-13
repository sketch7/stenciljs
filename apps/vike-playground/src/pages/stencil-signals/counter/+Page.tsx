import { AppSignalsCounter } from "@app/stencil-playground/react";
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
				<AppSignalsCounter />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				State is managed with <code>signal()</code> and <code>computed()</code> from <code>@ssv/stencil-signals</code>.{" "}
				<code>SignalWatcher</code> auto-tracks signal reads in <code>render()</code> — no <code>@State</code> needed.{" "}
				<code>@useSignal</code> binds signals to class properties for ergonomic reads and writes.
			</p>
		</div>
	);
}
