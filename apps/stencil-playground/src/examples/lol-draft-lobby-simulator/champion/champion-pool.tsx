import { getLogger } from "@logtape/logtape";
import { SsvElement } from "@ssv/stencil.core";
import { Component, Listen, Prop, h } from "@stencil/core";

import { useDraftMutations, useDraftSession } from "../draft/draft.hooks";
import type { Champion, ChampionRole, DraftSession, Team } from "../lol.types";
import type { ChampionCardStatus } from "./champion-card";
import { useChampionFilter } from "./champion-filter.hooks";
import { useChampions } from "./champion.hooks";

const logger = getLogger(["lol", "champion"]);

@Component({
	tag: "app-lol-champion-pool",
	styleUrl: "champion-pool.css",
	shadow: true,
})
export class AppLolChampionPool extends SsvElement {
	@Prop() draftId: string | null = null;
	/** Which team's actions this pool is acting for (blue or red). */
	@Prop() team: Team = "blue";

	readonly #champions = useChampions();
	readonly #filter = useChampionFilter();
	readonly #session = useDraftSession(() => this.draftId);
	readonly #mutations = useDraftMutations(() => this.draftId);

	@Listen("searchChange")
	onSearchChange(e: CustomEvent<string>) {
		this.#filter.setSearch(e.detail);
	}

	@Listen("roleToggle")
	onRoleToggle(e: CustomEvent<ChampionRole>) {
		this.#filter.toggleRole(e.detail);
	}

	@Listen("clearFilters")
	onClearFilters() {
		this.#filter.clearFilters();
	}

	private getChampionStatus(championId: string, session: DraftSession | null | undefined): ChampionCardStatus {
		if (!session) {
			return "available";
		}
		const pendingId = this.#mutations.pick.variables?.championId ?? this.#mutations.ban.variables?.championId;
		const isPending = (this.#mutations.pick.isPending || this.#mutations.ban.isPending) && pendingId === championId;
		if (isPending) {
			return "pending";
		}

		if ([...session.bluePicks, ...session.redPicks].includes(championId)) {
			return "picked";
		}
		if ([...session.blueBans, ...session.redBans].includes(championId)) {
			return "banned";
		}
		return "available";
	}

	private isDisabled(championId: string, session: DraftSession | null | undefined): boolean {
		if (!session) {
			return true;
		}
		const excluded = new Set(
			[...session.bluePicks, ...session.redPicks, ...session.blueBans, ...session.redBans].filter(Boolean) as string[],
		);

		// Also disable if a mutation is in-flight
		if (this.#mutations.pick.isPending || this.#mutations.ban.isPending) {
			return true;
		}
		return excluded.has(championId);
	}

	private getExcludedIds(session: DraftSession | null | undefined): Set<string> {
		if (!session) {
			return new Set();
		}
		return new Set(
			[...session.bluePicks, ...session.redPicks, ...session.blueBans, ...session.redBans].filter(Boolean) as string[],
		);
	}

	private handleChampionSelect(championId: string) {
		const session = this.#session.session.data;
		if (!session || session.phase === "finished") {
			return;
		}

		const currentTurn = session.turnOrder[session.currentTurnIndex];
		if (!currentTurn || currentTurn.team !== this.team) {
			return;
		}

		if (currentTurn.action === "pick") {
			logger.debug("Champion action: pick {championId} ({team})", { championId, team: this.team });
			this.#mutations.pick.mutate({ championId, team: this.team });
		} else {
			logger.debug("Champion action: ban {championId} ({team})", { championId, team: this.team });
			this.#mutations.ban.mutate({ championId, team: this.team });
		}
	}

	render() {
		const { data: champions, isPending: isLoadingChampions } = this.#champions.query;
		const session = this.#session.session.data;
		const excludedIds = this.getExcludedIds(session);
		const filteredChampions: Champion[] = champions ? this.#filter.filterFn(champions, excludedIds) : [];

		const currentTurn = session?.turnOrder[session.currentTurnIndex ?? -1];
		const isMyTurn = currentTurn?.team === this.team && session?.phase !== "finished";
		const actionLabel = currentTurn?.action === "ban" ? "Ban a champion" : "Pick a champion";

		return (
			<div class="pool">
				<div class="pool-header">
					<h2 class="pool-title">Champion Pool</h2>
					{isMyTurn && <span class={`turn-badge turn-badge--${this.team}`}>{actionLabel}</span>}
				</div>

				<app-lol-champion-filter
					search={this.#filter.search}
					activeRoles={this.#filter.roles}
					difficulty={this.#filter.difficulty}
				/>

				<div class="pool-grid-wrap">
					{isLoadingChampions && <div class="pool-status">Loading champions…</div>}

					{!isLoadingChampions && filteredChampions.length === 0 && (
						<div class="pool-status">No champions match your filters.</div>
					)}

					{!isLoadingChampions && filteredChampions.length > 0 && (
						<div class="pool-grid">
							{filteredChampions.map(champion => (
								<app-lol-champion-card
									key={champion.id}
									champion={champion}
									status={this.getChampionStatus(champion.id, session)}
									disabled={this.isDisabled(champion.id, session) || !isMyTurn}
									onChampionSelect={() => this.handleChampionSelect(champion.id)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}
}
