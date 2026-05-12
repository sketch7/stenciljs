import { SsvTodo } from "@ssv/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Todo List</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Add tasks, mark them complete, or delete them. All state is reactive via <code>@stencil/store</code>.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<SsvTodo />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				The component is server-rendered via <code>@stencil/ssr</code> using Declarative Shadow DOM and hydrated on the
				client.
			</p>
		</div>
	);
}
