import { SsvElement } from "@ssv/stencil-core";
import { Component, Event, Prop, h } from "@stencil/core";
import type { EventEmitter } from "@stencil/core";

import type { Champion } from "../lol.types";

export type ChampionCardStatus = "available" | "picked" | "banned" | "pending";

const ROLE_COLORS: Record<string, string> = {
	top: "#e67e22",
	jungle: "#27ae60",
	mid: "#8e44ad",
	bot: "#2980b9",
	support: "#c0392b",
};

const DIFFICULTY_LABEL = (d: number) => (d <= 3 ? "Easy" : d <= 6 ? "Medium" : d <= 8 ? "Hard" : "Expert");

@Component({
	tag: "app-lol-champion-card",
	styleUrl: "champion-card.css",
	shadow: true,
})
export class AppLolChampionCard extends SsvElement {
	@Prop() champion!: Champion;
	/** Card is not interactive (already picked/banned by either team). */
	@Prop({ reflect: true }) disabled = false;
	@Prop({ reflect: true }) status: ChampionCardStatus = "available";

	/** Fires with the champion ID when the card is clicked. */
	@Event({ bubbles: true, composed: true }) championSelect!: EventEmitter<string>;

	private handleClick() {
		if (!this.disabled) {
			this.championSelect.emit(this.champion.id);
		}
	}

	render() {
		const { champion, status } = this;
		const primaryRole = champion.roles[0] ?? "mid";
		const roleColor = ROLE_COLORS[primaryRole] ?? "#6366f1";

		return (
			<button
				type="button"
				class={`card card--${status}`}
				disabled={this.disabled}
				onClick={() => this.handleClick()}
				title={champion.name}>
				<div class="card-icon" style={{ "--role-color": roleColor }}>
					<img src={champion.iconUrl} alt={champion.name} loading="lazy" />
					{status === "pending" && (
						<div class="card-overlay card-overlay--pending">
							<span class="spinner" />
						</div>
					)}
					{status === "picked" && <div class="card-overlay card-overlay--picked" />}
					{status === "banned" && (
						<div class="card-overlay card-overlay--banned">
							<span class="ban-x">✕</span>
						</div>
					)}
				</div>
				<div class="card-body">
					<span class="card-name">{champion.name}</span>
					<div class="card-meta">
						<span class="card-roles">{champion.roles.join(" · ")}</span>
						<span class="card-diff" title={`Difficulty: ${champion.difficulty}/10`}>
							{DIFFICULTY_LABEL(champion.difficulty)}
						</span>
					</div>
				</div>
			</button>
		);
	}
}
