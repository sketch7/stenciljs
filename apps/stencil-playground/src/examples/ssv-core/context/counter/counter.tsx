import { SsvElement } from "@ssv/stencil-core";
import { Component, h } from "@stencil/core";

import { useCounter } from "./counter.hooks";

@Component({
	tag: "app-ctx-counter",
	styleUrl: "counter.css",
	shadow: true,
})
export class AppCtxCounter extends SsvElement {
	readonly #c = useCounter();

	render() {
		const { count } = this.#c;

		return (
			<div class="counter">
				<div class="count-display">
					<span class="count-value">{count}</span>
				</div>
				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => this.#c.decrement()}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => this.#c.increment()}>
						+
					</button>
				</div>
			</div>
		);
	}
}
