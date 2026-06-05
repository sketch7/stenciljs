import { detectServer, use, usePendingTasks } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import type { FetchQueryOptions, QueryClient } from "@tanstack/query-core";

/** When a prefetch blocks render by awaiting in hostWillLoad. */
export type PrefetchBlockMode = "always" | "server" | false;

/**
 * Server-blocking prefetch via {@link usePendingTasks} (server-only, awaited).
 *
 * Registers `factory` as a pending task on the server — Stencil awaits the returned promise
 * before `render()`. On the client the task is never called (no-op gate inside `usePendingTasks`).
 */
export function useServerPrefetch(
	clientRef: Ref<QueryClient>,
	getOpts: () => FetchQueryOptions | undefined | null | false,
): void {
	const tasks = usePendingTasks();
	tasks.add((): Promise<unknown> | undefined => {
		const qc = clientRef.current;
		const opts = getOpts();
		if (!qc || !opts) {
			return undefined;
		}
		return qc.prefetchQuery(opts);
	});
}

/**
 * Full prefetch lifecycle honoring `block`: server via {@link usePendingTasks},
 * client via `hostWillLoad`.
 *
 * - `"always"` — blocks on both server (awaited pending task) and client (awaited `hostWillLoad`).
 * - `"server"` — blocks server only; fire-and-forget on client.
 * - `false` — no blocking on either side.
 */
export function usePrefetchLifecycle(
	clientRef: Ref<QueryClient>,
	getOpts: () => FetchQueryOptions | undefined | null | false,
	block: PrefetchBlockMode,
): void {
	if (block === "always" || block === "server") {
		useServerPrefetch(clientRef, getOpts); // server
	}
	use(() => ({
		hostWillLoad(): Promise<void> | void {
			// server handled above via usePendingTasks
			if (detectServer()) {
				return;
			}
			const qc = clientRef.current;
			const opts = getOpts();
			if (!qc || !opts) {
				return;
			}
			const p = qc.prefetchQuery(opts);
			if (block === "always") {
				return p; // block client
			}
			void p; // fire-and-forget
		},
	}));
}
