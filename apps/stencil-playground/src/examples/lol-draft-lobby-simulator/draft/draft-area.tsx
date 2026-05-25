// oxlint-disable complexity
import { SsvElement } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import { useChampions } from "../champion/champion.hooks";
import type { Champion, DraftSession } from "../lol.types";
import { useDraftSession } from "./draft.hooks";

function buildChampionMap(champions: Champion[] | undefined): Map<string, Champion> {
	const map = new Map<string, Champion>();
	for (const c of champions ?? []) {
		map.set(c.id, c);
	}
	return map;
}

function getTurnLabel(session: DraftSession | null | undefined): string {
	if (!session) {
		return "";
	}
	if (session.phase === "finished") {
		return "Draft complete";
	}
	const turn = session.turnOrder[session.currentTurnIndex];
	if (!turn) {
		return "";
	}
	const team = turn.team === "blue" ? "Blue" : "Red";
	const action = turn.action === "ban" ? "ban" : "pick";
	return `${team} — ${action}`;
}

@Component({
	tag: "app-lol-draft-area",
	styleUrl: "draft-area.css",
	shadow: true,
})
export class AppLolDraftArea extends SsvElement {
	@Prop() draftId: string | null = null;
	/** Blue team is "my" team by default. */
	@Prop() myTeam: "blue" | "red" = "blue";

	readonly #session = useDraftSession(() => this.draftId);
	readonly #champions = useChampions();

	render() {
		const { data: session, isPending } = this.#session.session;
		const { data: champions } = this.#champions.query;
		const championMap = buildChampionMap(champions);

		const currentTurn = session?.turnOrder[session.currentTurnIndex ?? -1];

		return (
			<div class="draft-area">
				{/* Turn label bar */}
				{session && session.phase !== "finished" && (
					<div class={`turn-bar turn-bar--${currentTurn?.team ?? "blue"}`}>
						<span class="turn-bar-text">{getTurnLabel(session)}</span>
						<div class="turn-dots">
							{session.turnOrder.map((_, i) => (
								<span
									key={i}
									class={`turn-dot ${i < session.currentTurnIndex ? "turn-dot--done" : ""} ${i === session.currentTurnIndex ? "turn-dot--active" : ""}`}
								/>
							))}
						</div>
					</div>
				)}

				{session?.phase === "finished" && (
					<div class="finished-bar">
						<span class="finished-icon">🏆</span>
						<span class="finished-text">Draft Complete</span>
					</div>
				)}

				{isPending && !session && <div class="draft-loading">Loading draft…</div>}

				{/* Blue team */}
				<app-lol-team-section
					team="blue"
					picks={session?.bluePicks ?? [null, null, null, null, null]}
					bans={session?.blueBans ?? [null, null, null, null, null]}
					champions={championMap}
					isActive={currentTurn?.team === "blue" && session?.phase !== "finished"}
				/>

				<div class="teams-divider" />

				{/* Red team */}
				<app-lol-team-section
					team="red"
					picks={session?.redPicks ?? [null, null, null, null, null]}
					bans={session?.redBans ?? [null, null, null, null, null]}
					champions={championMap}
					isActive={currentTurn?.team === "red" && session?.phase !== "finished"}
				/>
			</div>
		);
	}
}
