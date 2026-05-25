import { SsvElement } from "@ssv/stencil-core";
import { Component, Prop, h } from "@stencil/core";

import type { Champion, Team } from "../lol.types";

@Component({
	tag: "app-lol-team-section",
	styleUrl: "team-section.css",
	shadow: true,
})
export class AppLolTeamSection extends SsvElement {
	@Prop() team!: Team;
	@Prop() picks: (string | null)[] = [null, null, null, null, null];
	@Prop() bans: (string | null)[] = [null, null, null, null, null];
	@Prop() champions = new Map<string, Champion>();
	@Prop({ reflect: true }) isActive = false;

	render() {
		const { team, picks, bans, champions } = this;

		return (
			<div class={`team team--${team}`}>
				<div class={`team-header ${this.isActive ? "team-header--active" : ""}`}>
					<span class="team-dot" />
					<span class="team-label">{team === "blue" ? "Blue Team" : "Red Team"}</span>
					{this.isActive && <span class="team-turn-indicator">▶ Your turn</span>}
				</div>

				{/* Picks row */}
				<div class="picks-row">
					{picks.map((championId, i) => (
						<app-lol-draft-slot
							key={`pick-${i}`}
							slotType="pick"
							champion={championId ? (champions.get(championId) ?? null) : null}
							status={championId ? "filled" : "empty"}
						/>
					))}
				</div>

				{/* Bans row */}
				<div class="bans-row">
					<span class="bans-label">Bans</span>
					{bans.map((championId, i) => (
						<app-lol-draft-slot
							key={`ban-${i}`}
							slotType="ban"
							champion={championId ? (champions.get(championId) ?? null) : null}
							status={championId ? "filled" : "empty"}
						/>
					))}
				</div>
			</div>
		);
	}
}
