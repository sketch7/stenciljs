import { SsvElement } from "@ssv/stencil-core";
import { Component, Prop, h } from "@stencil/core";

import type { Champion } from "../lol.types";

@Component({
	tag: "app-lol-draft-hero-card",
	styleUrl: "draft-hero-card.css",
	shadow: true,
})
export class AppLolDraftHeroCard extends SsvElement {
	@Prop() champion!: Champion;
	@Prop() slotType: "pick" | "ban" = "pick";

	render() {
		const { champion, slotType } = this;
		return (
			<div class={`hero hero--${slotType}`} title={champion.name}>
				<div class="hero-img">
					<img src={champion.iconUrl} alt={champion.name} loading="lazy" />
					{slotType === "ban" && (
						<div class="ban-overlay">
							<span class="ban-x">✕</span>
						</div>
					)}
				</div>
				<span class="hero-name">{champion.name}</span>
			</div>
		);
	}
}
