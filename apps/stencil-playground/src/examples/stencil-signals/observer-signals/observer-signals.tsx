import { SsvElement } from "@ssv/stencil-core";
import { computed, useSignalWatcher } from "@ssv/stencil-signals";
import { elementSize, intersect } from "@ssv/stencil-signals/extensions";
import { Component, Element, h } from "@stencil/core";

const ITEMS = Array.from({ length: 20 }, (_, i) => `Task ${i + 1}`);

@Component({
	tag: "app-signals-observer-signals",
	styleUrl: "observer-signals.css",
	shadow: true,
})
export class AppSignalsObserverSignals extends SsvElement {
	@Element() el!: HTMLElement;

	readonly _ = this.setup(useSignalWatcher());
	readonly #size = elementSize(() => this.el);
	readonly #intersect = intersect(() => this.el, {
		threshold: [0, 0.25, 0.5, 0.75, 1],
	});

	readonly #ratio = computed(() => {
		const r = this.#intersect()?.intersectionRatio ?? 0;
		return Math.round(r * 100);
	});

	readonly #isVisible = computed(() => this.#intersect()?.isIntersecting ?? false);

	render() {
		const { width, height } = this.#size();
		const ratio = this.#ratio();
		const visible = this.#isVisible();

		return (
			<div class="root">
				{/* ── elementSize panel ── */}
				<section class="panel">
					<div class="panel-header">
						<span class="panel-tag">elementSize</span>
						<h3 class="panel-title">Component dimensions</h3>
					</div>
					<p class="panel-desc">Resize your browser window to see these values update live.</p>

					<div class="size-grid">
						<div class="size-cell">
							<span class="size-label">Width</span>
							<span class="size-value">
								{Math.round(width)}
								<span class="size-unit">px</span>
							</span>
						</div>
						<div class="size-divider" />
						<div class="size-cell">
							<span class="size-label">Height</span>
							<span class="size-value">
								{Math.round(height)}
								<span class="size-unit">px</span>
							</span>
						</div>
					</div>
				</section>

				{/* ── intersect panel ── */}
				<section class="panel">
					<div class="panel-header">
						<span class="panel-tag">intersect</span>
						<h3 class="panel-title">Viewport intersection</h3>
					</div>
					<p class="panel-desc">Scroll the page to move this component in and out of the viewport.</p>

					<div class="intersect-status">
						<div class={`badge ${visible ? "badge--visible" : "badge--hidden"}`}>
							{visible ? "In viewport" : "Out of viewport"}
						</div>
						<span class="ratio-text">{ratio}% visible</span>
					</div>

					<progress class="ratio-track" value={ratio} max={100}>
						<div class="ratio-fill" style={{ width: `${ratio}%` }} />
					</progress>

					<div class="sentinel-container" aria-label="Task list">
						<ul class="item-list">
							{ITEMS.map((item, i) => (
								<li key={i} class="item">
									<span class="item-index">{i + 1}</span>
									<span class="item-text">{item}</span>
								</li>
							))}
							<li class="sentinel-row" aria-hidden="true">
								<span class="sentinel-label">— end of list —</span>
							</li>
						</ul>
					</div>
				</section>
			</div>
		);
	}
}
