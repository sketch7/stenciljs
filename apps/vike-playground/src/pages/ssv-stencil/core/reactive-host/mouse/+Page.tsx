import { AppMouseHost } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Mouse Controller</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					A <code>ReactiveController</code> that tracks the cursor position via{" "}
					<code>window.addEventListener("mousemove")</code>. The controller registers itself with the host in its
					constructor and cleans up on disconnect.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppMouseHost />
			</div>

			<div className="flex flex-col gap-2 text-xs text-[var(--color-muted-fg)]">
				<p>
					Implemented with <code>useMouseController(this)</code> — a factory function that creates and registers a{" "}
					<code>MouseController</code> on the <code>SsvElement</code> host.
				</p>
				<p>
					The controller calls <code>host.requestUpdate()</code> on each mouse move, triggering a re-render without any{" "}
					<code>@State</code> decorators.
				</p>
			</div>
		</div>
	);
}
