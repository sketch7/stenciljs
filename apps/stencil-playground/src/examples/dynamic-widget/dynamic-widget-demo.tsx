import { createComposeRegistry, defineCompose } from "@ssv/stencil-ui/compose";
import type { ComposeEventDetail } from "@ssv/stencil-ui/compose";
import { Component, State, h } from "@stencil/core";

import type { TimerWidgetData } from "./timer/ssv-timer-widget";

const demoRegistry = createComposeRegistry();
defineCompose<TimerWidgetData>("timer", { tag: "ssv-timer-widget", aliases: ["countdown"] }, demoRegistry);
defineCompose("count", { tag: "ssv-count-widget" }, demoRegistry);

@Component({
	tag: "app-dynamic-widget-demo",
	styleUrl: "dynamic-widget-demo.css",
	shadow: true,
})
export class AppDynamicWidgetDemo {
	@State() activeType: "timer" | "count" = "timer";
	@State() lastEvent: ComposeEventDetail | null = null;

	readonly #timerData: TimerWidgetData = { duration: 30 };

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
			<ssv-compose-registry-provider registry={demoRegistry}>
				<div class="demo">
					<h2>Compose Demo</h2>

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
							data={this.#widgetData(this.activeType)}
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

					<div class="error-demo">
						<p>
							<em>Unknown type renders error slot:</em>
						</p>
						<ssv-compose name="does-not-exist">
							<span slot="error">⚠ Widget name not registered</span>
						</ssv-compose>
					</div>
				</div>
			</ssv-compose-registry-provider>
		);
	}
}
