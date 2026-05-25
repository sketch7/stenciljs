// oxlint-disable complexity -- draft-info render has many conditional display states
import { SsvElement } from "@ssv/stencil-core";
import { Component, Prop, h } from "@stencil/core";

import { useDraftView } from "../draft/draft.hooks";
import { showNotification } from "../notification/notification.store";

const PHASE_LABELS: Record<string, string> = {
	waiting: "Waiting for Player",
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

	readonly #draft = useDraftView(() => this.draftId);

	private handleSimulate() {
		if (this.#draft.mutations.simulate.isPending) {
			return;
		}
		this.#draft.mutations.simulate.mutate(undefined, {
			onError: (err: unknown) => {
				showNotification(err instanceof Error ? err.message : "Simulate failed", "error");
			},
		});
	}

	private handleEnableSimulation() {
		if (!this.draftId) {
			return;
		}
		this.#draft.enableSim.enable.mutate(this.draftId, {
			onError: (err: unknown) => {
				showNotification(err instanceof Error ? err.message : "Could not enable simulation", "error");
			},
		});
	}

	render() {
		const { data: session, isPending } = this.#draft.session.session;
		const isSimulating = this.#draft.mutations.simulate.isPending;
		const isEnabling = this.#draft.enableSim.enable.isPending;

		if (isPending && !session) {
			return <div class="info info--loading">Starting draft…</div>;
		}

		if (!session) {
			return <div class="info info--loading">Waiting for session…</div>;
		}

		const isSolo = session.playerCount < 2;
		const currentTurn =
			session.phase === "finished" || session.phase === "waiting" ? null : session.turnOrder[session.currentTurnIndex];

		const isMyTurn = currentTurn?.team === this.myTeam;
		const isOpponentTurn = currentTurn && !isMyTurn;
		const progress = session.currentTurnIndex;
		const total = session.turnOrder.length;
		const progressPct = Math.round((progress / total) * 100);

		return (
			<div class="info">
				{/* Phase badge */}
				<div class={`phase-badge phase-badge--${session.phase}`}>{PHASE_LABELS[session.phase] ?? session.phase}</div>

				{/* Waiting for opponent */}
				{session.phase === "waiting" && (
					<div class="waiting-wrap">
						<p class="waiting-msg">⏳ Waiting for opponent to join…</p>
						<p class="waiting-hint">Share the URL with a friend, or play solo:</p>
						<button
							type="button"
							class="btn-simulate-enable"
							disabled={isEnabling}
							onClick={() => this.handleEnableSimulation()}>
							{isEnabling ? <span class="spinner" /> : null}
							{isEnabling ? "Starting…" : "⚡ Play Solo (Simulate Opponent)"}
						</button>
					</div>
				)}

				{/* Progress bar — only when draft is active */}
				{session.phase !== "waiting" && (
					<div class="progress-wrap" title={`Turn ${progress} of ${total}`}>
						<div class="progress-bar" style={{ width: `${progressPct}%` }} />
					</div>
				)}
				{session.phase !== "waiting" && (
					<p class="progress-label">
						{progress}/{total} turns
					</p>
				)}

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

				{/* Simulation mode active indicator */}
				{session.simulationMode && session.phase !== "finished" && session.phase !== "waiting" && (
					<div class="sim-active">⚡ Simulation Mode Active</div>
				)}

				{/* Manual simulate button — dev fallback when simulation is on and it's opponent's turn */}
				{isSolo && isOpponentTurn && session.phase !== "finished" && session.simulationMode && (
					<button type="button" class="btn-simulate" disabled={isSimulating} onClick={() => this.handleSimulate()}>
						{isSimulating ? <span class="spinner" /> : <span class="simulate-icon">⚡</span>}
						{isSimulating ? "Simulating…" : "Simulate Next"}
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
