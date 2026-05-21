export type ChampionRole = "top" | "jungle" | "mid" | "bot" | "support";
export type ChampionTag = "tank" | "fighter" | "assassin" | "mage" | "marksman" | "support" | "slayer";

export type Champion = {
	id: string;
	name: string;
	roles: ChampionRole[];
	difficulty: number; // 1–10
	iconUrl: string;
	tags: ChampionTag[];
	lore: string;
};

export type Team = "blue" | "red";
export type DraftAction = "pick" | "ban";
export type DraftPhase = "waiting" | "banning" | "picking" | "finished";

export type DraftTurn = {
	team: Team;
	action: DraftAction;
	slot: number;
};

export type DraftSession = {
	id: string;
	name: string;
	phase: DraftPhase;
	playerCount: number;
	simulationMode: boolean;
	currentTurnIndex: number;
	turnOrder: DraftTurn[];
	/** Champion IDs, null = empty slot */
	bluePicks: (string | null)[];
	blueBans: (string | null)[];
	redPicks: (string | null)[];
	redBans: (string | null)[];
	createdAt: string;
};
