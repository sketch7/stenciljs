import { computed, effect, signal, withSignalController } from "@ssv/stencil-signals";
import { withSignalProps } from "@ssv/stencil-signals/extensions";
import { SsvElement } from "@ssv/stencil.core";
import { Component, Event, EventEmitter, Prop, h } from "@stencil/core";

const PRESETS = [10, 30, 60, 120, 300] as const;

@Component({
	tag: "app-timer",
	styleUrl: "timer.css",
	shadow: true,
})
export class AppTimer extends SsvElement {
	@Prop() duration = 60;
	@Prop({ reflect: true }) isRunning = false;

	@Event() isRunningChange!: EventEmitter<boolean>;

	readonly signalWatcher = withSignalController(this);
	readonly $props = withSignalProps(
		this,
		AppTimer,
	)({
		duration: { transform: v => Math.max(0, v) },
		isRunning: { twoWay: true },
	});

	readonly $timeRemaining = signal(60);
	readonly $isCompleted = computed(() => this.$timeRemaining() === 0);

	#intervalId: ReturnType<typeof setInterval> | undefined;

	readonly _durationEffect = effect(
		this,
		[this.$props.duration],
		([d]) => {
			this.#stop();
			this.$timeRemaining.set(d);
		},
		{ defer: true },
	);

	readonly _completionEffect = effect(this, () => {
		if (this.$isCompleted()) {
			this.#stop();
		}
	});

	#start() {
		if (this.$props.isRunning()) {
			return;
		}
		this.$props.isRunning.set(true);
		this.#intervalId = setInterval(() => {
			this.$timeRemaining.update(t => Math.max(0, t - 1));
		}, 1000);
	}

	#stop() {
		this.$props.isRunning.set(false);
		if (this.#intervalId !== undefined) {
			clearInterval(this.#intervalId);
			this.#intervalId = undefined;
		}
	}

	#reset() {
		this.#stop();
		this.$timeRemaining.set(this.$props.duration());
	}

	#setTime(secs: number) {
		this.#stop();
		this.$timeRemaining.set(secs);
	}

	#toggle() {
		if (this.$props.isRunning()) {
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
		const done = this.$isCompleted();
		const running = this.$props.isRunning();

		return (
			<div class="timer">
				<app-timer-counter time-remaining={this.$timeRemaining()} />
				{done && <p class="badge-done">Done!</p>}
				<div class="controls">
					<button type="button" class="btn btn-primary" disabled={done} onClick={() => this.#toggle()}>
						{running ? "Pause" : "Start"}
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
