import { Component, Event, EventEmitter, Prop, h } from "@stencil/core";

export type TimerWidgetData = {
	duration: number;
	isRunning?: boolean;
};

export type TimerWidgetOutput = {
	isRunning: boolean;
};

@Component({
	tag: "ssv-timer-widget",
	shadow: false,
})
export class SsvTimerWidget {
	@Prop() data?: TimerWidgetData;
	@Event() ssvComposeOutput!: EventEmitter<TimerWidgetOutput>;

	render() {
		return (
			<app-timer
				duration={this.data?.duration}
				isRunning={this.data?.isRunning ?? false}
				onIsRunningChange={(e: CustomEvent<boolean>) => this.ssvComposeOutput.emit({ isRunning: e.detail })}
			/>
		);
	}
}
