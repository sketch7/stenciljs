import { AppTanTodo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Todo List</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Add tasks, mark them complete, or delete them. All state is reactive via <code>@tanstack/store</code>.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppTanTodo />
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				State is managed with a <code>@tanstack/store</code> <code>Store</code> via <code>createSelectorCtrl</code> from{" "}
				<code>@ssv/tanstack.stencil-store</code>. The selector subscribes to the store and calls{" "}
				<code>requestUpdate()</code> on changes — no <code>@State</code> decorators needed.
			</p>
		</div>
	);
}
