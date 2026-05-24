import { getLogger } from "@logtape/logtape";
import { use } from "@ssv/stencil.core";
import { Build } from "@stencil/core";

import type { DraftSession } from "../lol.types";
import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { BASE_URL } from "../shared/lol.constants";
import { DRAFTS_QUERY_KEY } from "./draft.client";

const logger = getLogger(["lol", "draft", "drafts-sse"]);

export function useDraftsSSE() {
	const client = useLolDraftQueryClient();

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
