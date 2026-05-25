import type { Champion } from "../lol.types";
import { BASE_URL } from "../shared/lol.constants";

export const CHAMPIONS_QUERY_KEY = ["lol-champions"] as const;

export async function fetchChampions(): Promise<Champion[]> {
	const url = `${BASE_URL}/api/lol/champions`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch champions: ${res.status}`);
	}
	return res.json() as Promise<Champion[]>;
}
