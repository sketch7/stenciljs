import { provideCompositionRegistry } from "@ssv/stencil-ui/compose";
import type { ComposeEventDetail } from "@ssv/stencil-ui/compose";
import { SsvElement } from "@ssv/stencil.core";
import { Component, State, h } from "@stencil/core";

import { demoCompositionDefs } from "./compose-definitions";
import type { ComposeTimerData } from "./timer/compose-timer";

@Component({
	tag: "app-compose-demo",
	styleUrl: "compose-demo.css",
	shadow: true,
})
export class AppComposeDemo extends SsvElement {
	readonly compositionRegistry = provideCompositionRegistry({
		definitions: demoCompositionDefs,
	});

	@State() activeType: "timer" | "count" = "timer";
	@State() lastEvent: ComposeEventDetail | null = null;

	readonly #timerData: ComposeTimerData = { duration: 30 };

	#widgetData(active: typeof this.activeType): unknown {
		switch (active) {
			case "timer": {
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

				<div class="tabs">
					<button
						type="button"
						class={`tab ${this.activeType === "timer" ? "tab--active" : ""}`}
						onClick={() => (this.activeType = "timer")}>
						Timer
					</button>
					<button
						type="button"
						class={`tab ${this.activeType === "count" ? "tab--active" : ""}`}
						onClick={() => (this.activeType = "count")}>
						Counter
					</button>
				</div>

				<div class="widget-host">
					<ssv-compose
						name={this.activeType}
						data={this.#widgetData(this.activeType)}
						onWidgetEvent={(e: CustomEvent<ComposeEventDetail>) => (this.lastEvent = e.detail)}
					/>
				</div>

				{this.lastEvent && (
					<div class="event-log">
						<strong>Last widgetEvent:</strong>
						<pre>{JSON.stringify(this.lastEvent, null, 2)}</pre>
					</div>
				)}

				<div class="alias-demo">
					<p>
						<em>&quot;countdown&quot; is an alias for &quot;timer&quot;</em>
					</p>
					<ssv-compose name="countdown" data={{ duration: 10 }} />
				</div>

				<div class="error-demo">
					<p>
						<em>Unknown name renders error slot:</em>
					</p>
					<ssv-compose name="does-not-exist">
						<span slot="error">⚠ Composition name not registered</span>
					</ssv-compose>
				</div>
			</div>
		);
	}
}
