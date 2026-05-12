import type { ReactiveController, ReactiveControllerHostInterface } from "@ssv/stenciljs.core";

class TimerController implements ReactiveController {
	private host: ReactiveControllerHostInterface;
	private intervalId: ReturnType<typeof setInterval> | undefined;
	readonly intervalMs: number;
	elapsed = 0;

	constructor(host: ReactiveControllerHostInterface, intervalMs = 1000) {
		this.host = host;
		this.intervalMs = intervalMs;
		host.addController(this);
	}

	hostConnected() {
		this.elapsed = 0;
		this.intervalId = setInterval(() => {
			this.elapsed += this.intervalMs;
			this.host.requestUpdate();
		}, this.intervalMs);
	}

	hostDisconnected() {
		if (this.intervalId !== undefined) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}
}

export function withTimerController(host: ReactiveControllerHostInterface, intervalMs?: number): TimerController {
	return new TimerController(host, intervalMs);
}
