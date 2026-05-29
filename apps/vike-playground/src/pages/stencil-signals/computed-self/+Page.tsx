import { AppSignalsComputedSelf } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Computed (previous value)</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Increment or decrement the value and watch the running total accumulate while the max only ever climbs. Each
					derivation reads its own previously computed result.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppSignalsComputedSelf />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				<code>computed(prev =&gt; value() + (prev ?? 0))</code> from <code>@ssv/stencil-signals</code> feeds the
				callback its own previous output. Seed the first run with <code>{"{ initialValue }"}</code> so <code>prev</code>{" "}
				is never undefined.
			</p>
		</div>
	);
}
