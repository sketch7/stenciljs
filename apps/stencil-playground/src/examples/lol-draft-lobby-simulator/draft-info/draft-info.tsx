import { SsvElement } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import { useDraftMutations, useDraftSession } from "../draft/draft.api";
import { showNotification } from "../notification/notification.store";

const PHASE_LABELS: Record<string, string> = {
	banning: "Banning Phase",
	picking: "Pick Phase",
	finished: "Draft Complete",
};

@Component({
	tag: "app-lol-draft-info",
	styleUrl: "draft-info.css",
	shadow: true,
})
export class AppLolDraftInfo extends SsvElement {
	@Prop() draftId: string | null = null;
	@Prop() myTeam: "blue" | "red" = "blue";

	readonly #session = useDraftSession(() => this.draftId);
	readonly #mutations = useDraftMutations(() => this.draftId);

	private handleSimulate() {
		if (this.#mutations.simulate.isPending) {
			return;
		}
		this.#mutations.simulate.mutate(undefined, {
			onError: (err: unknown) => {
				showNotification(err instanceof Error ? err.message : "Simulate failed", "error");
			},
		});
	}

	render() {
		const { data: session, isPending } = this.#session.session;
		const isSimulating = this.#mutations.simulate.isPending;

		if (isPending && !session) {
			return <div class="info info--loading">Starting draft…</div>;
		}

		if (!session) {
			return <div class="info info--loading">Waiting for session…</div>;
		}

		const currentTurn = session.phase === "finished" ? null : session.turnOrder[session.currentTurnIndex];

		const isMyTurn = currentTurn?.team === this.myTeam;
		const isOpponentTurn = currentTurn && !isMyTurn;
		const progress = session.currentTurnIndex;
		const total = session.turnOrder.length;
		const progressPct = Math.round((progress / total) * 100);

		return (
			<div class="info">
				{/* Phase badge */}
				<div class={`phase-badge phase-badge--${session.phase}`}>{PHASE_LABELS[session.phase] ?? session.phase}</div>

				{/* Progress bar */}
				<div class="progress-wrap" title={`Turn ${progress} of ${total}`}>
					<div class="progress-bar" style={{ width: `${progressPct}%` }} />
				</div>
				<p class="progress-label">
					{progress}/{total} turns
				</p>

				{/* Current turn */}
				{currentTurn && (
					<div class={`turn-info turn-info--${currentTurn.team}`}>
						<span class="turn-team-dot" />
						<span class="turn-label">
							{currentTurn.team === "blue" ? "Blue" : "Red"} — {currentTurn.action}
						</span>
						{isMyTurn && <span class="your-turn-badge">YOUR TURN</span>}
					</div>
				)}

				{session.phase === "finished" && (
					<div class="finished-msg">
						<span class="finished-trophy">🏆</span>
						<span>Draft Complete!</span>
					</div>
				)}

				{/* Simulate opponent button */}
				{isOpponentTurn && session.phase !== "finished" && (
					<button type="button" class="btn-simulate" disabled={isSimulating} onClick={() => this.handleSimulate()}>
						{isSimulating ? <span class="spinner" /> : <span class="simulate-icon">⚡</span>}
						{isSimulating ? "Simulating…" : "Simulate Opponent"}
					</button>
				)}

				{/* Session info */}
				{this.draftId && (
					<div class="session-meta">
						<span class="session-label">Session</span>
						<code class="session-id">{this.draftId.slice(0, 8)}…</code>
					</div>
				)}
			</div>
		);
	}
}
