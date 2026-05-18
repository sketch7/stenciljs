import { AppSignalsMouseEvent } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Mouse event (signalFromEvent)</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Tracks cursor position like the ReactiveController mouse demo, but with{" "}
					<code className="text-[var(--color-primary)]">signalFromEvent</code> instead of manual{" "}
					<code className="text-[var(--color-primary)]">addEventListener</code>.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsMouseEvent />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				<code>
					signalFromEvent(&apos;mousemove&apos;, &#123; target: &apos;window&apos;, map: ... &#125;)
				</code>{" "}
				mirrors <code>@Listen(&apos;mousemove&apos;, &#123; target: &apos;window&apos; &#125;)</code>.{" "}
				<code>useSignalWatcher()</code> re-renders when the signal updates — no <code>@State</code> or{" "}
				<code>requestUpdate()</code> in the component.
			</p>
		</div>
	);
}
