import { computed, useSignalWatcher } from "@ssv/stencil-signals";
import { useSignalProps } from "@ssv/stencil-signals/extensions";
import { SsvElement } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

@Component({
	tag: "app-timer-counter",
	styleUrl: "timer-counter.css",
	shadow: true,
})
export class AppTimerCounter extends SsvElement {
	@Prop({ reflect: true }) timeRemaining = 0;

	readonly signalWatcher = useSignalWatcher();
	readonly $props = useSignalProps(AppTimerCounter)({
		timeRemaining: {},
	});
	readonly $mins = computed(() => Math.floor(this.$props.timeRemaining() / 60));
	readonly $secs = computed(() => this.$props.timeRemaining() % 60);

	render() {
		const mins = this.$mins();
		const secs = this.$secs();

		return (
			<div class="time-display">
				<div class="time-item">
					<span class="time-label">Minutes</span>
					<span class="time-value">{pad(mins)}</span>
				</div>
				<div class="time-sep">:</div>
				<div class="time-item">
					<span class="time-label">Seconds</span>
					<span class="time-value">{pad(secs)}</span>
				</div>
			</div>
		);
	}
}
