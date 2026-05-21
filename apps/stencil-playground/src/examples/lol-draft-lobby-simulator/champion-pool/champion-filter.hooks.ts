import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";

import type { Champion, ChampionRole } from "../shared/lol.types";

export interface ChampionFilter {
	search: string;
	roles: ChampionRole[];
	difficulty: [number, number];
}

export function useChampionFilter() {
	// Installs the signal watcher on the current host so signal changes trigger re-render
	useSignalWatcher();

	const $search = signal("");
	const $roles = signal<ChampionRole[]>([]);
	const $difficulty = signal<[number, number]>([1, 10]);

	const $filterFn = computed(
		(): ((champions: Champion[], excludedIds: Set<string>) => Champion[]) => (champions, excludedIds) => {
			const s = $search().toLowerCase().trim();
			const roles = $roles();
			const [min, max] = $difficulty();

			return champions.filter(c => {
				if (excludedIds.has(c.id)) {
					return false;
				}
				if (s && !c.name.toLowerCase().includes(s)) {
					return false;
				}
				if (roles.length > 0 && !c.roles.some(r => roles.includes(r))) {
					return false;
				}
				if (c.difficulty < min || c.difficulty > max) {
					return false;
				}
				return true;
			});
		},
	);

	function toggleRole(role: ChampionRole) {
		const current = $roles();
		if (current.includes(role)) {
			$roles.set(current.filter(r => r !== role));
		} else {
			$roles.set([...current, role]);
		}
	}

	return {
		get search() {
			return $search();
		},
		get roles() {
			return $roles();
		},
		get difficulty() {
			return $difficulty();
		},
		get filterFn() {
			return $filterFn();
		},
		setSearch(v: string) {
			$search.set(v);
		},
		toggleRole,
		setDifficulty(range: [number, number]) {
			$difficulty.set(range);
		},
		clearFilters() {
			$search.set("");
			$roles.set([]);
			$difficulty.set([1, 10]);
		},
	};
}
