import { AppSignalsLinkedSignal } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Linked Signal</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Pick a course to set the quantity to that course's default. Edit the quantity, then switch courses — it
					resets. Re-selecting the same course keeps your edit, because a local write wins until the source genuinely
					changes.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppSignalsLinkedSignal />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				<code>linkedSignal(&#123; source, computation &#125;)</code> from <code>@ssv/stencil-signals/extensions</code>{" "}
				is a writable derived signal: it recomputes from <code>source</code> on change, but stays user-overridable in
				between.
			</p>
		</div>
	);
}
