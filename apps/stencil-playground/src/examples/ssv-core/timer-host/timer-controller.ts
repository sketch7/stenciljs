import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

class TimerController implements ReactiveController {
	#elapsed = 0;
	#intervalId: ReturnType<typeof setInterval> | undefined;
	get elapsed() { return this.#elapsed; }

	constructor(
		private readonly host: ReactiveControllerHost,
		private readonly intervalMs = 1000
	) {
		host.addController(this);
	}

	hostConnected() {
		this.#elapsed = 0;
		this.#intervalId = setInterval(() => {
			this.#elapsed += this.intervalMs;
			this.host.requestUpdate();
		}, this.intervalMs);
	}

	hostDisconnected() {
		if (this.#intervalId !== undefined) {
			clearInterval(this.#intervalId);
			this.#intervalId = undefined;
		}
	}
}

export function useTimerController(host: ReactiveControllerHost, intervalMs?: number): TimerController {
	return new TimerController(host, intervalMs);
}
