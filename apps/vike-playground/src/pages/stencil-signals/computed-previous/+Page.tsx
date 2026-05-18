import { AppSignalsComputedPrevious } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Computed Previous</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Increment or decrement to see the previous value tracked alongside the current one. The direction indicator
					reflects whether the value went up, down, or stayed the same.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppSignalsComputedPrevious />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				<code>computedPrevious(count)</code> from <code>@ssv/stencil-signals</code> is declared as a class field. It is
				a derived signal that tracks the previous value of <code>count</code> for direction indicators and trails.
			</p>
		</div>
	);
}
