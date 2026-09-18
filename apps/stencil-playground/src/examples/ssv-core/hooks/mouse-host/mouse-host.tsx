import { SsvElement } from "@ssv/stencil-core";
import { Component, h } from "@stencil/core";

import { useMouseController } from "./mouse-controller";

@Component({
	tag: "app-mouse-host",
	styleUrl: "mouse-host.css",
	shadow: true,
})
export class AppMouseHost extends SsvElement {
	readonly #mouse = useMouseController();

	render() {
		return (
			<div class="mouse-host">
				<div class="pos-display">
					<div class="pos-item">
						<span class="pos-label">X</span>
						<span class="pos-value">{this.#mouse.pos.x}</span>
					</div>
					<div class="pos-item">
						<span class="pos-label">Y</span>
						<span class="pos-value">{this.#mouse.pos.y}</span>
					</div>
				</div>
				<p class="hint">Move your mouse to update the position.</p>
			</div>
		);
	}
}
