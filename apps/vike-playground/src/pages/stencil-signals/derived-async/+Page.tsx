import { AppSignalsDerivedAsync } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Derived Async</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Navigate between users fetched from JSONPlaceholder. Each user change cancels the previous in-flight request
					automatically via <code>AbortSignal</code>.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsDerivedAsync />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				<code>useDerivedAsync</code> from <code>@ssv/stencil-signals/extensions</code> uses an internal reactive effect
				to re-run when <code>userId</code> changes (switch cancellation via <code>AbortSignal</code>). It returns a
				disposable <code>Signal&lt;T&gt;</code>: typically <code>undefined</code> until the first success, then the
				resolved value; failed reads throw the rejection (handled with try/catch in this demo). The host ties the
				lifecycle to this component.
			</p>
		</div>
	);
}
