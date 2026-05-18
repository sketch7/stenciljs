import { AppTimerHost } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Timer Controller</h1>
				<p className="text-sm text-(--color-muted-fg)">
					A <code>ReactiveController</code> that counts elapsed time using <code>setInterval</code>. The interval starts
					in <code>hostConnected</code> and is cleared in <code>hostDisconnected</code> — no manual lifecycle management
					needed in the component.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppTimerHost />
			</div>

			<div className="flex flex-col gap-2 text-xs text-(--color-muted-fg)">
				<p>
					Implemented with <code>useTimerController(this, 1000)</code> — a factory that creates and registers a{" "}
					<code>TimerController</code> with a configurable interval.
				</p>
				<p>
					On each tick the controller calls <code>host.requestUpdate()</code>, which calls{" "}
					<code>forceUpdate(this)</code> from <code>@stencil/core</code> — scheduling a re-render without{" "}
					<code>@State</code>.
				</p>
			</div>
		</div>
	);
}
