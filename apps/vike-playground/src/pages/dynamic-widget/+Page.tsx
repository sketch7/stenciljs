import { AppDynamicWidgetDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Compose</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Demonstrates <code>ssv-compose</code> — renders components by name string + data object using a context-scoped
					registry. The demo component provides its own registry via{" "}
					<code>provideContext(ComposeRegistryContext, registry)</code>.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppDynamicWidgetDemo />
			</div>
		</div>
	);
}
