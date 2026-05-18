import { Component, Event, EventEmitter, Prop, h } from "@stencil/core";

export type ComposeTimerData = {
	duration: number;
	isRunning?: boolean;
};

export type ComposeTimerOutput = {
	isRunning: boolean;
};

@Component({
	tag: "app-compose-timer",
	shadow: false,
})
export class AppComposeTimer {
	@Prop() data!: ComposeTimerData;
	@Event() ssvComposeOutput!: EventEmitter<ComposeTimerOutput>;

	render() {
		return (
			<app-timer
				duration={this.data.duration}
				isRunning={this.data.isRunning ?? false}
				onIsRunningChange={(e: CustomEvent<boolean>) => this.ssvComposeOutput.emit({ isRunning: e.detail })}
			/>
		);
	}
}
