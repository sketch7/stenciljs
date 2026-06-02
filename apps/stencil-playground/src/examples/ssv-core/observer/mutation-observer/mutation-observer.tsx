import { SsvElement } from "@ssv/stencil-core";
import { mutationObserver } from "@ssv/stencil-core/dom";
import { Component, Element, State, h } from "@stencil/core";

@Component({
	tag: "app-mutation-observer",
	styleUrl: "mutation-observer.css",
	shadow: true,
})
export class AppMutationObserver extends SsvElement {
	@Element() el!: HTMLElement;
	@State() mutationCount = 0;
	@State() lastType = "–";
	@State() childCount = 0;
	@State() hasClass = false;

	private listEl: HTMLElement | null = null;

	readonly _ = mutationObserver(
		() => this.listEl,
		records => {
			this.mutationCount += records.length;
			this.lastType = records.at(-1)?.type ?? "–";
			this.childCount = this.listEl?.children.length ?? 0;
		},
		{ childList: true, attributes: true },
	);

	private addNode(): void {
		if (!this.listEl) {
			return;
		}
		const item = document.createElement("div");
		item.className = "list-item";
		item.textContent = `Item ${this.listEl.children.length + 1}`;
		this.listEl.append(item);
	}

	private removeNode(): void {
		if (!this.listEl || this.listEl.children.length === 0) {
			return;
		}
		this.listEl.lastElementChild?.remove();
	}

	private toggleAttr(): void {
		if (!this.listEl) {
			return;
		}
		this.hasClass = !this.hasClass;
		this.listEl.toggleAttribute("data-highlighted", this.hasClass);
	}

	render() {
		return (
			<div class="mutation-observer">
				<div class="stats">
					<div class="stat-item">
						<span class="stat-label">Mutations</span>
						<span class="stat-value">{this.mutationCount}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Last type</span>
						<span class="stat-value stat-type">{this.lastType}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Children</span>
						<span class="stat-value">{this.childCount}</span>
					</div>
				</div>

				<div
					class="list-container"
					ref={el => {
						this.listEl = el ?? null;
					}}
				/>

				<div class="actions">
					<button type="button" class="btn btn-add" onClick={() => this.addNode()}>
						Add node
					</button>
					<button
						type="button"
						class="btn btn-remove"
						onClick={() => this.removeNode()}
						disabled={this.childCount === 0}>
						Remove node
					</button>
					<button type="button" class="btn btn-attr" onClick={() => this.toggleAttr()}>
						Toggle attr
					</button>
				</div>

				<p class="hint">Click buttons to mutate the DOM — each change fires via mutationObserver.</p>
			</div>
		);
	}
}
