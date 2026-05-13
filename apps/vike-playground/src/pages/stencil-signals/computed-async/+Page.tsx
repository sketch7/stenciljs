import { AppSignalsComputedAsync } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Computed Async</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Navigate between users fetched from JSONPlaceholder. Each user change cancels the previous in-flight request
					automatically via <code>AbortSignal</code>.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsComputedAsync />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				<code>computedAsync</code> from <code>@ssv/stencil-signals/extensions</code> derives an async signal that
				re-runs whenever <code>userId</code> changes. The result is an <code>AsyncResult&lt;T&gt;</code> discriminated
				union with <code>pending</code>, <code>resolved</code>, and <code>error</code> states. Passing <code>this</code>{" "}
				as host ties the signal lifecycle to the component.
			</p>
		</div>
	);
}
