import { getLogger } from "@logtape/logtape";
import { use } from "@ssv/stencil.core";
import { useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { Build } from "@stencil/core";

import { BASE_URL } from "../shared/lol.constants";
import { DRAFTS_QUERY_KEY } from "./draft.client";

import type { DraftSession } from "#/api";

const logger = getLogger(["lol", "draft", "drafts-sse"]);

export function useDraftsSSE(queryClient?: QueryClient) {
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
