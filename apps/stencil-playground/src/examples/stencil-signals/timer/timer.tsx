import { computed, effect, signal, withSignalController } from "@ssv/stencil-signals";
import { SsvElement } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

const PRESETS = [10, 30, 60, 120, 300] as const;

const timeRemaining = signal(60);
const isRunning = signal(false);
const initialTime = signal(60);

const minutes = computed(() => Math.floor(timeRemaining() / 60));
const seconds = computed(() => timeRemaining() % 60);
const isCompleted = computed(() => timeRemaining() === 0);
const buttonLabel = computed(() => (isRunning() ? "Pause" : "Start"));

@Component({
	tag: "app-signals-timer",
	styleUrl: "timer.css",
	shadow: true,
})
export class AppSignalsTimer extends SsvElement {
	#intervalId: ReturnType<typeof setInterval> | undefined;

	readonly signalWatcher = withSignalController(this);

	readonly _completionEffect = effect(
		this,
		[isCompleted],
		([done]) => {
			if (done) {
				this.#stop();
			}
		},
		{ defer: true },
	);

	#start() {
		if (isRunning()) {
			return;
		}
		isRunning.set(true);

		this.#intervalId = setInterval(() => {
			timeRemaining.update(t => Math.max(0, t - 1));
		}, 1000);
	}

	#stop() {
		isRunning.set(false);
		if (this.#intervalId !== undefined) {
			clearInterval(this.#intervalId);
			this.#intervalId = undefined;
		}
	}

	#reset() {
		this.#stop();
		timeRemaining.set(initialTime());
	}

	#setTime(secs: number) {
		this.#stop();
		initialTime.set(secs);
		timeRemaining.set(secs);
	}

	#toggle() {
		if (isRunning()) {
			this.#stop();
		} else {
			this.#start();
		}
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback?.();
		this.#stop();
	}

	render() {
		const mins = minutes();
		const secs = seconds();
		const done = isCompleted();

		return (
			<div class="timer">
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

				{done && <p class="badge-done">Done!</p>}

				<div class="controls">
					<button type="button" class="btn btn-primary" disabled={done} onClick={() => this.#toggle()}>
						{buttonLabel()}
					</button>
					<button type="button" class="btn btn-outline" onClick={() => this.#reset()}>
						Reset
					</button>
				</div>

				<div class="presets">
					{PRESETS.map(s => (
						<button type="button" class="btn btn-preset" key={s} onClick={() => this.#setTime(s)}>
							{s < 60 ? `${s}s` : `${s / 60}m`}
						</button>
					))}
				</div>
			</div>
		);
	}
}
