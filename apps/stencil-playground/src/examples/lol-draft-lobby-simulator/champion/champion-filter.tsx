import { SsvElement } from "@ssv/stencil-core";
import { Component, Event, Prop, h } from "@stencil/core";
import type { EventEmitter } from "@stencil/core";

import type { ChampionRole } from "../lol.types";

const ROLES: ChampionRole[] = ["top", "jungle", "mid", "bot", "support"];

@Component({
	tag: "app-lol-champion-filter",
	styleUrl: "champion-filter.css",
	shadow: true,
})
export class AppLolChampionFilter extends SsvElement {
	@Prop() search = "";
	@Prop() activeRoles: ChampionRole[] = [];
	@Prop() difficulty: [number, number] = [1, 10];

	@Event() searchChange!: EventEmitter<string>;
	@Event() roleToggle!: EventEmitter<ChampionRole>;
	@Event() clearFilters!: EventEmitter<void>;

	private handleSearchInput(e: Event) {
		this.searchChange.emit((e.target as HTMLInputElement).value);
	}

	render() {
		const hasActiveFilters = this.search !== "" || this.activeRoles.length > 0;

		return (
			<div class="filter">
				<div class="filter-search-row">
					<div class="search-wrap">
						<span class="search-icon" aria-hidden="true">
							⚔
						</span>
						<input
							class="search-input"
							type="search"
							placeholder="Search champions…"
							value={this.search}
							onInput={e => this.handleSearchInput(e)}
							aria-label="Search champions"
						/>
					</div>
					{hasActiveFilters && (
						<button type="button" class="btn-clear" onClick={() => this.clearFilters.emit()} title="Clear filters">
							✕
						</button>
					)}
				</div>
				<fieldset class="filter-roles">
					<legend class="sr-only">Filter by role</legend>
					<button
						type="button"
						class={`role-btn ${this.activeRoles.length === 0 ? "role-btn--active" : ""}`}
						onClick={() => this.clearFilters.emit()}>
						All
					</button>
					{ROLES.map(role => (
						<button
							key={role}
							type="button"
							class={`role-btn role-btn--${role} ${this.activeRoles.includes(role) ? "role-btn--active" : ""}`}
							onClick={() => this.roleToggle.emit(role)}>
							{role.charAt(0).toUpperCase() + role.slice(1)}
						</button>
					))}
				</fieldset>
			</div>
		);
	}
}
