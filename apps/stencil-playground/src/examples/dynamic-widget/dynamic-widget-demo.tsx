import { createWidgetRegistry, defineWidget } from "@ssv/dynamic-widget";
import type { WidgetEventDetail } from "@ssv/dynamic-widget";
import { Component, State, h } from "@stencil/core";

import type { TimerWidgetData } from "./timer/ssv-timer-widget";

const demoRegistry = createWidgetRegistry();
defineWidget<TimerWidgetData>("timer", { tag: "ssv-timer-widget", aliases: ["countdown"] }, demoRegistry);
defineWidget("count", { tag: "ssv-count-widget" }, demoRegistry);

@Component({
	tag: "app-dynamic-widget-demo",
	styleUrl: "dynamic-widget-demo.css",
	shadow: true,
})
export class AppDynamicWidgetDemo {
	@State() activeType: "timer" | "count" = "timer";
	@State() lastEvent: WidgetEventDetail | null = null;

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
			<ssv-widget-registry-provider registry={demoRegistry}>
				<div class="demo">
					<h2>Dynamic Widget Demo</h2>

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
						<ssv-dynamic-widget
							name={this.activeType}
							data={this.#widgetData(this.activeType)}
							onWidgetEvent={(e: CustomEvent<WidgetEventDetail>) => (this.lastEvent = e.detail)}
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
						<ssv-dynamic-widget name="countdown" data={{ duration: 10 }} />
					</div>

					<div class="error-demo">
						<p>
							<em>Unknown type renders error slot:</em>
						</p>
						<ssv-dynamic-widget name="does-not-exist">
							<span slot="error">⚠ Widget name not registered</span>
						</ssv-dynamic-widget>
					</div>
				</div>
			</ssv-widget-registry-provider>
		);
	}
}
