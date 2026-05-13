import { SignalWatcher, useSignal } from "@ssv/stencil-signals";
import { Component, h, Mixin } from "@stencil/core";

import { additionalValue, count, doubled, total } from "./counter.signals";

@Component({
	tag: "app-signals-counter",
	styleUrl: "counter.css",
	shadow: true,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppSignalsCounter extends Mixin(SignalWatcher) {
	@useSignal(count) declare count: number;
	@useSignal(additionalValue) declare additionalValue: number;

	override render() {
		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{this.count}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => this.count--}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => this.count++}>
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
						value={this.additionalValue}
						onInput={e => (this.additionalValue = Number.parseInt((e.target as HTMLInputElement).value, 10) || 0)}
					/>
					<span class="formula-hint">× 2 = {doubled()}</span>
				</div>

				<div class="total">
					<span class="total-label">Total</span>
					<span class="total-value">
						{this.count} + {this.additionalValue} × 2 = <strong>{total()}</strong>
					</span>
				</div>
			</div>
		);
	}
}
