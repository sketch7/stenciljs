import { SsvElement } from "@ssv/stencil-core";
import { intersectionObserver } from "@ssv/stencil-core/observer";
import { Component, Element, State, h } from "@stencil/core";

@Component({
	tag: "app-intersection-observer",
	styleUrl: "intersection-observer.css",
	shadow: true,
})
export class AppIntersectionObserver extends SsvElement {
	@Element() el!: HTMLElement;
	@State() isVisible = false;
	@State() ratio = 0;

	readonly _ = intersectionObserver(
		() => this.el,
		entry => {
			this.isVisible = entry.isIntersecting;
			this.ratio = entry.intersectionRatio;
		},
		{ threshold: [0, 0.25, 0.5, 0.75, 1] },
	);

	render() {
		return (
			<div class={{ "intersection-observer": true, visible: this.isVisible }}>
				<div class="status">
					<span class={{ dot: true, active: this.isVisible }} />
					<span class="label">{this.isVisible ? "Visible" : "Not visible"}</span>
				</div>
				<div class="ratio-bar">
					<div class="ratio-fill" style={{ width: `${Math.round(this.ratio * 100)}%` }} />
				</div>
				<p class="hint">Scroll to show/hide — ratio: {Math.round(this.ratio * 100)}%</p>
			</div>
		);
	}
}
