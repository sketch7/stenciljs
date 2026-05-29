import type { Champion } from "../lol.types";

export const CHAMPIONS_QUERY_KEY = ["lol-champions"] as const;

export async function fetchChampions(baseUrl: string): Promise<Champion[]> {
	const url = `${baseUrl}/api/lol/champions`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch champions: ${res.status}`);
	}
	return res.json() as Promise<Champion[]>;
}
