import { getLogger } from "@logtape/logtape";

import { useConfig } from "../../../startup-context";
import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { useSSE } from "../stencil-sse";

const logger = getLogger(["lol", "draft", "sse"]);

type DraftSSEEvents = {
	connected: { phase?: string; currentTurnIndex?: number };
	"draft-updated": { phase?: string; currentTurnIndex?: number };
};

export function useDraftSSE(getDraftId: () => string | null) {
	const client = useLolDraftQueryClient();
	const config = useConfig();

	useSSE<DraftSSEEvents>(
		() => {
			const id = getDraftId();
			return id ? `${config.current?.baseUrl() ?? ""}/api/lol/drafts/${id}/events` : null;
		},
		{
			onOpen() {
				logger.info("SSE connecting: draftId={draftId}", { draftId: getDraftId() });
			},
			onError() {
				logger.warn("SSE error: draftId={draftId}", { draftId: getDraftId() });
			},
			on: {
				connected(data) {
					logger.info("SSE connected: phase={phase} turn={turn}", {
						draftId: getDraftId(),
						phase: data.phase,
						turn: data.currentTurnIndex,
					});
				},
				"draft-updated"(data) {
					const id = getDraftId();
					logger.debug("Draft updated via SSE: phase={phase} turn={turn}", {
						draftId: id,
						phase: data.phase,
						turn: data.currentTurnIndex,
					});
					void client.current?.invalidateQueries({ queryKey: ["lol-draft", id] });
				},
			},
		},
	);
}
