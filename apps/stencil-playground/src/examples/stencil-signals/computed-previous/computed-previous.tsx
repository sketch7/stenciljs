import { SsvElement } from "@ssv/stencil-core";
import { computedPrevious, signal, useSignalWatcher } from "@ssv/stencil-signals";
import { Component, h } from "@stencil/core";

const count = signal(0);

@Component({
	tag: "app-signals-computed-previous",
	styleUrl: "computed-previous.css",
	shadow: true,
})
export class AppSignalsComputedPrevious extends SsvElement {
	readonly signalWatcher = useSignalWatcher();
	readonly prevCount = computedPrevious(count);

	render() {
		const curr = count();
		const prev = this.prevCount();
		const direction = prev === undefined ? "–" : curr > prev ? "↑" : curr < prev ? "↓" : "=";
		const dirClass = prev === undefined ? "" : curr > prev ? "dir-up" : curr < prev ? "dir-down" : "dir-same";

		return (
			<div class="prev">
				<div class="values">
					<div class="value-item">
						<span class="value-label">Previous</span>
						<span class="value-num value-prev">{prev ?? "–"}</span>
					</div>
					<div class={`direction ${dirClass}`}>{direction}</div>
					<div class="value-item">
						<span class="value-label">Current</span>
						<span class="value-num value-curr">{curr}</span>
					</div>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => count.update(n => n - 1)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => count.update(n => n + 1)}>
						+
					</button>
				</div>

				<div class="trail-row">
					<span class="trail-label">Trail</span>
					<span class="trail">
						{prev !== undefined && <span class="trail-prev">{prev}</span>}
						{prev !== undefined && <span class="trail-arrow">→</span>}
						<span class="trail-curr">{curr}</span>
					</span>
				</div>
			</div>
		);
	}
}
