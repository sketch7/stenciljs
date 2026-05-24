import { getLogger } from "@logtape/logtape";
import { use } from "@ssv/stencil.core";
import { Build } from "@stencil/core";

import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { BASE_URL } from "../shared/lol.constants";

const logger = getLogger(["lol", "draft", "sse"]);

export function useDraftSSE(getDraftId: () => string | null) {
	const client = useLolDraftQueryClient();

	return use(() => {
		let es: EventSource | undefined;
		let lastDraftId: string | null = null;

		function connect(draftId: string) {
			es?.close();
			logger.info("SSE connecting: draftId={draftId}", { draftId });
			es = new EventSource(`${BASE_URL}/api/lol/drafts/${draftId}/events`);
			es.addEventListener("connected", e => {
				const data = JSON.parse((e as MessageEvent<string>).data) as { phase?: string; currentTurnIndex?: number };
				logger.info("SSE connected: phase={phase} turn={turn}", {
					draftId,
					phase: data.phase,
					turn: data.currentTurnIndex,
				});
			});
			es.addEventListener("draft-updated", e => {
				const data = JSON.parse((e as MessageEvent<string>).data) as { phase?: string; currentTurnIndex?: number };
				logger.debug("Draft updated via SSE: phase={phase} turn={turn}", {
					draftId,
					phase: data.phase,
					turn: data.currentTurnIndex,
				});
				client.current?.invalidateQueries({ queryKey: ["lol-draft", draftId] });
			});
			es.addEventListener("error", () => {
				logger.warn("SSE error: draftId={draftId}", { draftId });
			});
		}

		return {
			hooks: {
				hostConnected() {
					if (Build.isServer) {
						return;
					}
					const id = getDraftId();
					if (id) {
						lastDraftId = id;
						connect(id);
					}
				},
				hostDidRender() {
					const id = getDraftId();
					if (id && id !== lastDraftId) {
						logger.info("SSE reconnecting: new draftId={draftId}", { draftId: id });
						lastDraftId = id;
						connect(id);
					}
				},
				hostDisconnected() {
					logger.debug("SSE disconnected: draftId={draftId}", { draftId: lastDraftId });
					es?.close();
					es = undefined;
					lastDraftId = null;
				},
			},
			value: {},
		};
	});
}
