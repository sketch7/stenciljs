import { SsvElementMixin } from "@ssv/stenciljs.core";
import { Component, Mixin, h } from "@stencil/core";

import { withMouseController } from "./mouse-controller";

@Component({
	tag: "ssv-mouse-host",
	styleUrl: "ssv-mouse-host.css",
	shadow: true,
})
export class SsvMouseHost extends Mixin(SsvElementMixin) {
	private mouse = withMouseController(this);

	render() {
		return (
			<div class="mouse-host">
				<div class="pos-display">
					<div class="pos-item">
						<span class="pos-label">X</span>
						<span class="pos-value">{this.mouse.pos.x}</span>
					</div>
					<div class="pos-item">
						<span class="pos-label">Y</span>
						<span class="pos-value">{this.mouse.pos.y}</span>
					</div>
				</div>
				<p class="hint">Move your mouse to update the position.</p>
			</div>
		);
	}
}
