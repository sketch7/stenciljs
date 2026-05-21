import { use } from "@ssv/stencil.core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { Build } from "@stencil/core";

import { BASE_URL } from "../shared/lol.constants";
import type { DraftSession } from "../shared/lol.types";

export const LOBBY_QUERY_KEY = ["lol-lobby"] as const;

async function fetchLobbyList(): Promise<DraftSession[]> {
	const res = await fetch(`${BASE_URL}/api/lol/drafts`);
	if (!res.ok) {
		throw new Error(`Failed to fetch lobby: ${res.status}`);
	}
	return res.json() as Promise<DraftSession[]>;
}

export function useListDrafts(queryClient?: QueryClient) {
	const listRef = useQuery(
		() => ({
			queryKey: LOBBY_QUERY_KEY,
			queryFn: fetchLobbyList,
			staleTime: 0,
			refetchInterval: 5000,
		}),
		queryClient,
	);
	return {
		get list() {
			return listRef();
		},
	};
}

export function useLobbySSE(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	return use(() => {
		let es: EventSource | undefined;

		return {
			hooks: {
				hostConnected() {
					if (Build.isServer) {
						return;
					}
					es = new EventSource(`${BASE_URL}/api/lol/lobby/events`);
					es.addEventListener("lobby-updated", () => {
						client.current?.invalidateQueries({ queryKey: LOBBY_QUERY_KEY });
					});
				},
				hostDisconnected() {
					es?.close();
					es = undefined;
				},
			},
			value: {},
		};
	});
}
