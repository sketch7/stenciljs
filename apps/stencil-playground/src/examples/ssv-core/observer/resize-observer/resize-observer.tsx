import { SsvElement } from "@ssv/stencil-core";
import { resizeObserver } from "@ssv/stencil-core/dom";
import { Component, Element, State, h } from "@stencil/core";

@Component({
	tag: "app-resize-observer",
	styleUrl: "resize-observer.css",
	shadow: true,
})
export class AppResizeObserver extends SsvElement {
	@Element() el!: HTMLElement;
	@State() width = 0;
	@State() height = 0;

	readonly _ = resizeObserver(
		() => this.el,
		entry => {
			const { width, height } = entry.contentRect;
			this.width = Math.round(width);
			this.height = Math.round(height);
		},
	);

	render() {
		return (
			<div class="resize-observer">
				<div class="size-display">
					<div class="size-item">
						<span class="size-label">Width</span>
						<span class="size-value">{this.width}</span>
						<span class="size-unit">px</span>
					</div>
					<div class="size-sep">×</div>
					<div class="size-item">
						<span class="size-label">Height</span>
						<span class="size-value">{this.height}</span>
						<span class="size-unit">px</span>
					</div>
				</div>
				<p class="hint">Drag the corner to resize — size updates via resizeObserver.</p>
			</div>
		);
	}
}
