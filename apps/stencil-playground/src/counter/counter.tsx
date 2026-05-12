import { Component, h, State } from "@stencil/core";

import { counterStore } from "./counter.store";

@Component({
	tag: "app-counter",
	styleUrl: "counter.css",
	shadow: true,
})
export class AppCounter {
	@State() count = counterStore.count;
	@State() additionalValue = counterStore.additionalValue;

	private increment() {
		counterStore.count++;
		this.count = counterStore.count;
	}

	private decrement() {
		counterStore.count--;
		this.count = counterStore.count;
	}

	private handleAdditionalChange(event: Event) {
		const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
		counterStore.additionalValue = Number.isNaN(value) ? 0 : value;
		this.additionalValue = counterStore.additionalValue;
	}

	render() {
		const doubled = this.additionalValue * 2;
		const total = this.count + doubled;

		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{this.count}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => this.decrement()}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => this.increment()}>
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
						onInput={e => this.handleAdditionalChange(e)}
					/>
					<span class="formula-hint">× 2 = {doubled}</span>
				</div>

				<div class="total">
					<span class="total-label">Total</span>
					<span class="total-value">
						{this.count} + {this.additionalValue} × 2 = <strong>{total}</strong>
					</span>
				</div>
			</div>
		);
	}
}
