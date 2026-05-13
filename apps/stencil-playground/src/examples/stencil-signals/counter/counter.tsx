import { computed, signal, withSignalController } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";
import { Component, h, Mixin } from "@stencil/core";

const count = signal(0);
const additionalValue = signal(0);
const doubled = computed(() => additionalValue() * 2);
const total = computed(() => count() + doubled());

@Component({
	tag: "app-signals-counter",
	styleUrl: "counter.css",
	shadow: true,
})
export class AppSignalsCounter extends Mixin(SsvElementMixin) {
	readonly signalWatcher = withSignalController(this);

	render() {
		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{count()}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => count.update(c => c - 1)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => count.update(c => c + 1)}>
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
			</div>
		);
	}
}
