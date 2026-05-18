import { AppComposeDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Compose</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Demonstrates <code>ssv-compose</code> — render widgets by name + data. The demo uses{" "}
					<code>provideCompositionRegistry</code> for a scoped registry and <code>registerCompositionDefs</code> in{" "}
					<code>global.ts</code> for SSR-safe global types. Host state uses <code>CompositionNameOf</code> for typed tab
					names; unknown <code>name</code> values show the error slot and log known types in dev.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppComposeDemo />
			</div>
		</div>
	);
}
