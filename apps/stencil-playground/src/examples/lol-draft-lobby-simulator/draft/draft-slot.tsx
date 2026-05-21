import { SsvElement } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import type { Champion } from "../shared/lol.types";

export type DraftSlotStatus = "empty" | "pending" | "filled";

@Component({
	tag: "app-lol-draft-slot",
	styleUrl: "draft-slot.css",
	shadow: true,
})
export class AppLolDraftSlot extends SsvElement {
	@Prop() slotType: "pick" | "ban" = "pick";
	@Prop() champion: Champion | null = null;
	@Prop({ reflect: true }) status: DraftSlotStatus = "empty";

	render() {
		const { slotType, champion, status } = this;

		return (
			<div
				class={`slot slot--${slotType} slot--${status}`}
				aria-label={champion?.name ?? (slotType === "pick" ? "Pick slot" : "Ban slot")}>
				{status === "filled" && champion && <app-lol-draft-hero-card champion={champion} slotType={slotType} />}
				{status === "pending" && (
					<div class="slot-pending">
						<span class="spinner" aria-label="Pending" />
					</div>
				)}
				{status === "empty" && (
					<div class="slot-empty">
						<span class="slot-empty-icon">{slotType === "ban" ? "✕" : "+"}</span>
					</div>
				)}
			</div>
		);
	}
}
