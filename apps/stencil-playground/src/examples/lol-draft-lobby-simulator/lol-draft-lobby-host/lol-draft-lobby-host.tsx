// oxlint-disable-next-line import/no-unassigned-import -- side-effect: runs configureSync before any component lifecycle
import "../shared/logging";
import { getLogger } from "@logtape/logtape";
import { SsvElement } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { QueryClient } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, State, h } from "@stencil/core";

import { useDraftSSE } from "../draft/draft-sse.hooks";
import type { LobbyJoinEvent } from "../lobby/lol-lobby-list";
import type { Team } from "../lol.types";
import { provideLolDraftContentQueryClient, provideLolDraftQueryClient } from "../shared/lol-query-client";

const logger = getLogger(["lol"]);

@Component({
	tag: "app-lol-draft-lobby-host",
	styleUrl: "lol-draft-lobby-host.css",
	shadow: true,
})
export class AppLolDraftLobbyHost extends SsvElement {
	// Transfer state must be declared before provideLolDraftQueryClient.
	readonly #ts = provideTransferState("lol-draft");
	readonly _ = this.setup(() => {
		// SSE drives real-time invalidation — disable window-focus refetching to avoid noise.
		provideLolDraftQueryClient({
			client: new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
			withHydration: this.#ts,
		});
		provideLolDraftContentQueryClient({ withHydration: this.#ts });
		useQueryDevtools({ enabled: true });
		// Subscribe to per-session SSE once we have a draftId.
		useDraftSSE(() => this.draftId);
	});

	@State() view: "lobby" | "draft" = "lobby";
	@State() draftId: string | null = null;
	@State() myTeam: Team | null = null;

	private handleCreate(e: CustomEvent<LobbyJoinEvent>) {
		this.draftId = e.detail.session.id;
		this.myTeam = e.detail.team;
		this.view = "draft";
		logger.info("View \u2192 draft (create): draftId={draftId} team={team}", {
			draftId: this.draftId,
			team: this.myTeam,
		});
	}

	private handleJoin(e: CustomEvent<LobbyJoinEvent>) {
		this.draftId = e.detail.session.id;
		this.myTeam = e.detail.team;
		this.view = "draft";
		logger.info("View \u2192 draft (join): draftId={draftId} team={team}", {
			draftId: this.draftId,
			team: this.myTeam,
		});
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
