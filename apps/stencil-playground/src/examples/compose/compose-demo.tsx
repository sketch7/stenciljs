import { provideCompositionRegistry } from "@ssv/stencil-ui/compose";
import type { ComposeEventDetail } from "@ssv/stencil-ui/compose";
import { SsvElement } from "@ssv/stencil.core";
import { Component, State, h } from "@stencil/core";

import { demoCompositionDefs } from "./compose-defs";
import type { DemoCompositionName } from "./compose-defs";
import type { TimerWidgetData } from "./timer/ssv-timer-widget";

@Component({
	tag: "app-compose-demo",
	styleUrl: "compose-demo.css",
	shadow: true,
})
export class AppComposeDemo extends SsvElement {
	readonly composeRegistry = provideCompositionRegistry(demoCompositionDefs);

	@State() activeType: DemoCompositionName = "timer";
	@State() lastEvent: ComposeEventDetail | null = null;

	readonly #timerData: TimerWidgetData = { duration: 30 };

	#data(active: DemoCompositionName): unknown {
		switch (active) {
			case "timer":
			case "countdown": {
				return this.#timerData;
			}
			case "count": {
				return {};
			}
			default: {
				return {};
			}
		}
	}

	render() {
		return (
			<div class="demo">
				<h2>Compose Demo</h2>

				<section class="demo-section">
					<h3>Scoped registry</h3>
					<span class="demo-hint">
						Types registered via provideCompositionRegistry(demoCompositionDefs) on this host.
					</span>

					<div class="tabs">
						<button
							type="button"
							class={`tab ${this.activeType === "timer" ? "tab--active" : ""}`}
							onClick={() => (this.activeType = "timer")}>
							Timer widget
						</button>
						<button
							type="button"
							class={`tab ${this.activeType === "count" ? "tab--active" : ""}`}
							onClick={() => (this.activeType = "count")}>
							Count widget
						</button>
					</div>

					<div class="widget-host">
						<ssv-compose
							name={this.activeType}
							data={this.#data(this.activeType)}
							onComposeEvent={(e: CustomEvent<ComposeEventDetail>) => (this.lastEvent = e.detail)}
						/>
					</div>

					{this.lastEvent && (
						<div class="event-log">
							<strong>Last composeEvent:</strong>
							<pre>{JSON.stringify(this.lastEvent, null, 2)}</pre>
						</div>
					)}

					<div class="alias-demo">
						<p>
							<em>&quot;countdown&quot; is an alias for &quot;timer&quot;</em>
						</p>
						<ssv-compose name="countdown" data={{ duration: 10 }} />
					</div>
				</section>

				<section class="demo-section global-section">
					<h3>Global registry</h3>
					<p class="demo-hint">
						Uses registerCompositionDefs from compose-defs.ts (imported in global.ts) — no scoped provider on this
						subtree.
					</p>
					<div class="widget-host">
						<ssv-compose name="timer" data={{ duration: 15 }} />
					</div>
				</section>

				<section class="demo-section error-demo">
					<h3>Unknown name</h3>
					<p class="demo-hint">
						<em>Unknown type renders the error slot; in dev, the console warns with known types.</em>
					</p>
					<ssv-compose name="does-not-exist">
						<span slot="error">⚠ Widget name not registered</span>
					</ssv-compose>
				</section>
			</div>
		);
	}
}
