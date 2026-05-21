import { SsvElement } from "@ssv/stencil.core";
import { provideTransferState } from "@ssv/stencil.core/transfer-state";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import { Component, State, h } from "@stencil/core";

import { useDraftSSE } from "../draft/draft-sse.hooks";
import type { LobbyJoinEvent } from "../lobby/lol-lobby-list";
import type { Team } from "../shared/lol.types";

@Component({
	tag: "app-lol-draft-lobby-host",
	styleUrl: "lol-draft-lobby-host.css",
	shadow: true,
})
export class AppLolDraftLobbyHost extends SsvElement {
	// Transfer state must be declared before provideQueryClient.
	readonly #ts = provideTransferState("lol-draft");
	readonly #queryClient = provideQueryClient({ withHydration: this.#ts });

	@State() view: "lobby" | "draft" = "lobby";
	@State() draftId: string | null = null;
	@State() myTeam: Team | null = null;

	// Subscribe to per-session SSE once we have a draftId
	readonly _ = useDraftSSE(() => this.draftId, this.#queryClient);

	private handleCreate(e: CustomEvent<LobbyJoinEvent>) {
		this.draftId = e.detail.session.id;
		this.myTeam = e.detail.team;
		this.view = "draft";
	}

	private handleJoin(e: CustomEvent<LobbyJoinEvent>) {
		this.draftId = e.detail.session.id;
		this.myTeam = e.detail.team;
		this.view = "draft";
	}

	render() {
		return (
			<div class="host">
				{this.#ts.toScriptElement()}

				{/* Global notification overlay */}
				<app-lol-notification />

				{this.view === "lobby" && (
					<app-lol-lobby-list
						onAppCreate={(e: CustomEvent<LobbyJoinEvent>) => this.handleCreate(e)}
						onAppJoin={(e: CustomEvent<LobbyJoinEvent>) => this.handleJoin(e)}
					/>
				)}

				{this.view === "draft" && this.draftId && this.myTeam && (
					<app-lol-draft-layout session-id={this.draftId}>
						<app-lol-champion-pool slot="champion-pool" draft-id={this.draftId} team={this.myTeam} />
						<app-lol-draft-area slot="draft-area" draft-id={this.draftId} my-team={this.myTeam} />
						<app-lol-draft-info slot="draft-info" draft-id={this.draftId} my-team={this.myTeam} />
					</app-lol-draft-layout>
				)}
			</div>
		);
	}
}
