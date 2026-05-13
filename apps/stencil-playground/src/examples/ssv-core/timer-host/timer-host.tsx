import { SsvElementMixin } from "@ssv/stencil.core";
import { Component, Mixin, h } from "@stencil/core";

import { withTimerController } from "./timer-controller";

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

@Component({
	tag: "app-timer-host",
	styleUrl: "timer-host.css",
	shadow: true,
})
export class AppTimerHost extends Mixin(SsvElementMixin) {
	private timer = withTimerController(this, 1000);

	render() {
		const totalSeconds = Math.floor(this.timer.elapsed / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return (
			<div class="timer-host">
				<div class="time-display">
					<div class="time-item">
						<span class="time-label">Hours</span>
						<span class="time-value">{pad(hours)}</span>
					</div>
					<div class="time-item">
						<span class="time-label">Minutes</span>
						<span class="time-value">{pad(minutes)}</span>
					</div>
					<div class="time-item">
						<span class="time-label">Seconds</span>
						<span class="time-value">{pad(seconds)}</span>
					</div>
				</div>
				<p class="hint">Elapsed time since the component was connected.</p>
			</div>
		);
	}
}
