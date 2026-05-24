import { getLogger } from "@logtape/logtape";

import type { DraftSession } from "../lol.types";
import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { BASE_URL } from "../shared/lol.constants";
import { useSSE } from "../stencil-sse";
import { DRAFTS_QUERY_KEY } from "./draft.client";

const logger = getLogger(["lol", "draft", "drafts-sse"]);

type LobbySSEEvents = {
	connected: DraftSession[];
	"lobby-updated": DraftSession[];
};

export function useDraftsSSE() {
	const client = useLolDraftQueryClient();

	useSSE<LobbySSEEvents>(() => `${BASE_URL}/api/lol/lobby/events`, {
		onOpen() {
			logger.info("Creating Lobby SSE connection...");
		},
		on: {
			connected(sessions) {
				logger.info("Lobby SSE connected: {count} open sessions", { count: sessions.length });
			},
			"lobby-updated"(sessions) {
				logger.debug("Lobby updated: {count} sessions", { count: sessions.length });
				client.current?.invalidateQueries({ queryKey: DRAFTS_QUERY_KEY });
			},
		},
	});
}
