import { AppSignalsTodo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Todo List</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Add tasks, mark them complete, or delete them. Completed and pending counts are computed automatically.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppSignalsTodo />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				State is managed with <code>createStore</code> from <code>@ssv/stencil-signals/extensions</code>. The store
				wraps a plain object in per-key signals via a reactive Proxy. The <code>computedFactory</code> arg derives{" "}
				<code>completedCount</code> and <code>pendingCount</code> automatically — no manual sync needed.
			</p>
		</div>
	);
}
