import { use } from "@ssv/stencil.core";
import { useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { Build } from "@stencil/core";

import { BASE_URL } from "../shared/lol.constants";

export function useDraftSSE(getDraftId: () => string | null, queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	return use(() => {
		let es: EventSource | undefined;
		let lastDraftId: string | null = null;

		function connect(draftId: string) {
			es?.close();
			es = new EventSource(`${BASE_URL}/api/lol/drafts/${draftId}/events`);
			es.addEventListener("draft-updated", () => {
				client.current?.invalidateQueries({ queryKey: ["lol-draft", draftId] });
			});
			es.addEventListener("error", () => {
				// Reconnect handled automatically by EventSource
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
						lastDraftId = id;
						connect(id);
					}
				},
				hostDisconnected() {
					es?.close();
					es = undefined;
					lastDraftId = null;
				},
			},
			value: {},
		};
	});
}
