import { getLogger } from "@logtape/logtape";
import { use } from "@ssv/stencil.core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { Build } from "@stencil/core";

import type { DraftSession } from "../lol.types";
import { BASE_URL } from "../shared/lol.constants";

const logger = getLogger(["lol", "lobby"]);

export const DRAFTS_QUERY_KEY = ["lol-drafts"] as const;

async function fetchDraftList(): Promise<DraftSession[]> {
	logger.info("Fetching draft list...");
	const res = await fetch(`${BASE_URL}/api/lol/drafts`);
	if (!res.ok) {
		throw new Error(`Failed to fetch draft list: ${res.status}`);
	}
	return res.json() as Promise<DraftSession[]>;
}

export function useListDrafts(queryClient?: QueryClient) {
	const listRef = useQuery(
		() => ({
			queryKey: DRAFTS_QUERY_KEY,
			queryFn: fetchDraftList,
			// SSE (useLobbySSE) drives all invalidations — treat cached data as always fresh.
			staleTime: Infinity,
			// staleTime: 0,
			// refetchInterval: 5000,
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
					logger.info("Creating Lobby SSE connection...");
					es = new EventSource(`${BASE_URL}/api/lol/lobby/events`);
					es.addEventListener("connected", e => {
						const sessions = JSON.parse((e as MessageEvent<string>).data) as DraftSession[];
						logger.info("Lobby SSE connected: {count} open sessions", { count: sessions.length });
					});
					es.addEventListener("lobby-updated", e => {
						const sessions = JSON.parse((e as MessageEvent<string>).data) as DraftSession[];
						logger.debug("Lobby updated: {count} sessions", { count: sessions.length });
						client.current?.invalidateQueries({ queryKey: DRAFTS_QUERY_KEY });
					});
				},
				hostDisconnected() {
					logger.debug("SSE disconnected");
					es?.close();
					es = undefined;
				},
			},
			value: {},
		};
	});
}
