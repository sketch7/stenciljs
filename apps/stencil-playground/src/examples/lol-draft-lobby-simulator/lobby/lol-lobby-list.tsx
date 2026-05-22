import { getLogger } from "@logtape/logtape";
// oxlint-disable react/only-export-components -- Stencil component file with co-located event type
import { SsvElement } from "@ssv/stencil.core";
import { Component, Event, h } from "@stencil/core";
import type { EventEmitter } from "@stencil/core";

import { useCreateDraft, useJoinDraft } from "../draft/draft.api";
import { showNotification } from "../notification/notification.store";
import type { DraftSession, Team } from "../shared/lol.types";
import { useListDrafts, useLobbySSE } from "./lobby.api";

const logger = getLogger(["lol", "lobby"]);

export type LobbyJoinEvent = { session: DraftSession; team: Team };

const PHASE_LABELS: Record<string, string> = {
	waiting: "Waiting",
	banning: "Banning",
	picking: "Picking",
	finished: "Finished",
};

@Component({
	tag: "app-lol-lobby-list",
	styleUrl: "lol-lobby-list.css",
	shadow: true,
})
export class AppLolLobbyList extends SsvElement {
	readonly #list = useListDrafts();
	readonly #create = useCreateDraft();
	readonly #join = useJoinDraft();
	readonly _ = useLobbySSE();

	@Event() appCreate!: EventEmitter<LobbyJoinEvent>;
	@Event() appJoin!: EventEmitter<LobbyJoinEvent>;

	private handleCreate() {
		this.#create.create.mutate(undefined, {
			onSuccess: session => {
				logger.info("Draft created: id={id} name={name}", { id: session.id, name: session.name });
				this.appCreate.emit({ session, team: "blue" });
			},
			onError: (err: unknown) => {
				logger.error("Create draft failed: {error}", { error: String(err) });
				showNotification(err instanceof Error ? err.message : "Failed to create draft", "error");
			},
		});
	}

	private handleJoin(draftId: string) {
		this.#join.join.mutate(draftId, {
			onSuccess: session => {
				logger.info("Joined draft: id={id}", { id: session.id });
				this.appJoin.emit({ session, team: "red" });
			},
			onError: (err: unknown) => {
				logger.error("Join draft failed: {error}", { error: String(err) });
				showNotification(err instanceof Error ? err.message : "Failed to join draft", "error");
			},
		});
	}

	render() {
		const { data: sessions, isPending, isError } = this.#list.list;
		const isCreating = this.#create.create.isPending;
		const joiningId = this.#join.join.isPending ? (this.#join.join.variables as string | undefined) : null;

		return (
			<div class="lobby">
				<header class="lobby-header">
					<div class="lobby-title-row">
						<span class="lobby-icon">⚔</span>
						<div>
							<h1 class="lobby-title">Draft Lobby</h1>
							<p class="lobby-subtitle">Create a new draft or join an existing one</p>
						</div>
					</div>
					<button class="btn-create" type="button" disabled={isCreating} onClick={() => this.handleCreate()}>
						{isCreating ? <span class="spinner" /> : <span class="btn-icon">+</span>}
						{isCreating ? "Creating…" : "Create Draft"}
					</button>
				</header>

				<div class="sessions-wrap">
					{isPending && (
						<div class="lobby-state">
							<span class="spinner spinner--lg" />
							<span>Loading sessions…</span>
						</div>
					)}

					{isError && <div class="lobby-state lobby-state--error">Unable to load sessions. Check your connection.</div>}

					{sessions && sessions.length === 0 && (
						<div class="lobby-state lobby-state--empty">
							<span class="empty-icon">🏟</span>
							<p>No active drafts. Create one to get started!</p>
						</div>
					)}

					{sessions && sessions.length > 0 && (
						<ul class="sessions-list">
							{sessions.map(session => {
								const isFull = session.playerCount >= 2;
								const isJoining = joiningId === session.id;
								return (
									<li class={`session-card session-card--${session.phase}`} key={session.id}>
										<div class="session-top">
											<span class="session-name">{session.name}</span>
											<span class={`phase-badge phase-badge--${session.phase}`}>
												{PHASE_LABELS[session.phase] ?? session.phase}
											</span>
										</div>

										<div class="session-players">
											<span class={`player-slot ${session.playerCount >= 1 ? "player-slot--filled" : ""}`}>
												🔵 Blue {session.playerCount >= 1 ? "●" : "○"}
											</span>
											<span class={`player-slot ${isFull ? "player-slot--filled" : ""}`}>
												🔴 Red {isFull ? "●" : "○"}
											</span>
										</div>

										<div class="session-footer">
											<span class="session-id">#{session.id.slice(0, 8)}</span>
											{isFull ? (
												<span class="badge-full">Full</span>
											) : (
												<button
													class="btn-join"
													type="button"
													disabled={isJoining || isFull}
													onClick={() => this.handleJoin(session.id)}>
													{isJoining ? <span class="spinner spinner--sm" /> : null}
													{isJoining ? "Joining…" : "Join as Red"}
												</button>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		);
	}
}
