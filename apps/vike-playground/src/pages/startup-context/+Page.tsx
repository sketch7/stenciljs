import { AppStartupContextInspector } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Startup Context</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Live snapshot of all six context stores populated by <code>app-startup-context-provider</code>. Values are
					read directly from <code>@ssv/stencil-signals/store</code> — toggle the theme in the sidebar to see{" "}
					<code>theme.mode</code> update in real time.
				</p>
			</div>

			<AppStartupContextInspector />
		</div>
	);
}
