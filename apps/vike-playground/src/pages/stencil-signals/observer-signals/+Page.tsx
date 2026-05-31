import { AppSignalsObserverSignals } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">elementSize / intersect</h1>
				<p className="text-sm text-(--color-muted-fg)">
					<code className="text-(--color-primary)">elementSize</code> tracks the component's border-box dimensions via{" "}
					<code className="text-(--color-primary)">ResizeObserver</code>.{" "}
					<code className="text-(--color-primary)">intersect</code> tracks viewport visibility via{" "}
					<code className="text-(--color-primary)">IntersectionObserver</code>. Resize the browser window or scroll this
					page to see both signals update live.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppSignalsObserverSignals />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				Both signals are from <code>@ssv/stencil-signals/extensions</code> and bind automatically to the Stencil
				component lifecycle — no manual <code>disconnect()</code> needed. <code>elementSize</code> defaults to{" "}
				<code>border-box</code>; <code>intersect</code> accepts the same options as{" "}
				<code>IntersectionObserver</code>.
			</p>
		</div>
	);
}
