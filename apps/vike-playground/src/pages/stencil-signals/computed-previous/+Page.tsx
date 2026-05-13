import { AppSignalsComputedPrevious } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Computed Previous</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Increment or decrement to see the previous value tracked alongside the current one. The direction indicator
					reflects whether the value went up, down, or stayed the same.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsComputedPrevious />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				<code>computedPrevious(count, this)</code> from <code>@ssv/stencil-signals</code> is declared as a class
				property. Passing <code>this</code> as host enables automatic disposal on <code>disconnectedCallback</code> and
				reinitialization on <code>connectedCallback</code>.
			</p>
		</div>
	);
}
