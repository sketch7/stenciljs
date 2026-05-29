import { SsvElement } from "@ssv/stencil-core";
import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";
import { Component, Prop, h } from "@stencil/core";

const count = signal(0);
const additionalValue = signal(0);
const doubled = computed(() => additionalValue() * 2);
const total = computed(() => count() + doubled());
// `computed` feeds the callback its own previous value. Seeding with
// `initialValue` types `prev` as `number` (never undefined) and infers `T`.
const peakTotal = computed(prev => Math.max(prev, total()), { initialValue: 0 });

@Component({
	tag: "app-signals-counter",
	styleUrl: "counter.css",
	shadow: true,
})
export class AppSignalsCounter extends SsvElement {
	@Prop() step = 1;

	readonly signalWatcher = useSignalWatcher();

	render() {
		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{count()}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => count.update(c => c - this.step)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => count.update(c => c + this.step)}>
						+
					</button>
				</div>

				<div class="additional">
					<label class="input-label" htmlFor="additional-input">
						Additional value
					</label>
					<input
						id="additional-input"
						class="input"
						type="number"
						value={additionalValue()}
						onInput={e => additionalValue.update(() => Number.parseInt((e.target as HTMLInputElement).value, 10) || 0)}
					/>
					<span class="formula-hint">
						{additionalValue()} × 2 = {doubled()}
					</span>
				</div>

				<div class="total">
					<span class="total-label">Total</span>
					<span class="total-value">
						{count()} + {additionalValue()} × 2 = <strong>{total()}</strong>
					</span>
				</div>

				<div class="total">
					<span class="total-label">Peak total</span>
					<span class="total-value">
						highest total seen so far = <strong>{peakTotal()}</strong>
					</span>
				</div>
			</div>
		);
	}
}
