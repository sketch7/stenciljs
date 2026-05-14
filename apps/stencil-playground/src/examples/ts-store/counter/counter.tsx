import { SsvElement } from "@ssv/stencil.core";
import { createAtom, useAtom, useSelector } from "@ssv/tanstack.stencil-store";
import { Component, h } from "@stencil/core";

// standalone atoms — demonstrates useAtom usage
const countAtom = createAtom(0);
const additionalAtom = createAtom(0);
const doubledAtom = createAtom(() => additionalAtom.get() * 2);
const totalAtom = createAtom(() => {
	const count = countAtom.get() ?? 0;
	return count + doubledAtom.get();
});

@Component({
	tag: "app-tan-counter",
	styleUrl: "counter.css",
	shadow: true,
})
export class AppTanCounter extends SsvElement {
	readonly #count = useAtom(() => countAtom);
	readonly #additional = useAtom(() => additionalAtom);
	readonly #doubled = useSelector(() => doubledAtom);
	readonly #total = useSelector(() => totalAtom);

	private handleAdditionalChange(event: Event) {
		const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
		this.#additional.set(Number.isNaN(value) ? 0 : value);
	}

	render() {
		const count = this.#count.value ?? 0;
		const additionalValue = this.#additional.value ?? 0;
		const doubled = this.#doubled();
		const total = this.#total();

		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{count}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => this.#count.set(prev => prev - 1)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => this.#count.set(prev => prev + 1)}>
						+
					</button>
				</div>

				<div class="additional">
					<label class="input-label" htmlFor="tan-additional-input">
						Additional value
					</label>
					<input
						id="tan-additional-input"
						class="input"
						type="number"
						value={additionalValue}
						onInput={e => this.handleAdditionalChange(e)}
					/>
					<span class="formula-hint">× 2 = {doubled}</span>
				</div>

				<div class="total">
					<span class="total-label">Total</span>
					<span class="total-value">
						{count} + {additionalValue} × 2 = <strong>{total}</strong>
					</span>
				</div>
			</div>
		);
	}
}
