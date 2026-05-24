import { signal } from "@ssv/stencil-signals";
import { use } from "@ssv/stencil.core";
import { Build } from "@stencil/core";

import type { SSEController, SSEEventHandler, SSEEventMap, SSELastEvent, SSEOptions, SSEStatus } from "./sse.types";

/**
 * Lifecycle-aware SSE hook. Opens an `EventSource` connection when the component mounts
 * and tears it down on disconnect.
 *
 * - **Reactive URL** — reconnects automatically when `getUrl()` returns a new value
 *   (controlled by `autoReconnect`, default `true`).
 * - **Signal-backed state** — `status` and `lastEvent` are signal getters; add
 *   `useSignalWatcher()` to the component to trigger re-renders on changes.
 * - **SSR-safe** — skips connection entirely when `Build.isServer` is `true`.
 *
 * @example
 * ```ts
 * useSSE<{ "lobby-updated": DraftSession[] }>(() => `${BASE_URL}/api/lobby/events`, {
 *   on: {
 *     "lobby-updated"(sessions) {
 *       client.current?.invalidateQueries({ queryKey: LOBBY_QUERY_KEY });
 *     },
 *   },
 * });
 * ```
 *
 * @example Reactive URL (reconnects when `getDraftId()` changes)
 * ```ts
 * useSSE<DraftSSEEvents>(
 *   () => getDraftId() ? `${BASE_URL}/api/drafts/${getDraftId()}/events` : null,
 *   { on: { "draft-updated": handleUpdate } }
 * );
 * ```
 */
export function useSSE<TEvents extends object = SSEEventMap>(
	getUrl: () => string | null | undefined,
	options?: SSEOptions<TEvents>,
): SSEController<TEvents> {
	const {
		autoConnect = true,
		autoReconnect = true,
		parseJson = true,
		withCredentials = false,
		on: staticHandlers,
		onOpen,
		onError,
	} = options ?? {};

	return use(() => {
		const $status = signal<SSEStatus>("idle");
		const $lastEvent = signal<SSELastEvent | null>(null);

		let es: EventSource | undefined;
		let lastUrl: string | null | undefined;

		// Runtime listeners registered via sse.on() — stored as untyped for simplicity
		const runtimeListeners = new Map<string, Set<SSEEventHandler<unknown>>>();

		// ── Internal helpers ──────────────────────────────────────────────────

		function parseData(raw: string): unknown {
			if (!parseJson) {
				return raw;
			}
			try {
				return JSON.parse(raw);
			} catch {
				return raw;
			}
		}

		function makeEventListener(type: string) {
			return (ev: Event) => {
				const msg = ev as MessageEvent<string>;
				const data = parseData(msg.data);

				$lastEvent.set({ type, data });

				// Static handler
				const staticHandler = (staticHandlers as Record<string, SSEEventHandler<unknown>> | undefined)?.[type];
				staticHandler?.(data, msg);

				// Runtime handlers
				const handlers = runtimeListeners.get(type);
				if (handlers) {
					for (const h of handlers) {
						h(data, msg);
					}
				}
			};
		}

		function openConnection(url: string): void {
			closeConnection();
			$status.set("connecting");
			es = new EventSource(url, { withCredentials });

			es.addEventListener("open", ev => {
				$status.set("connected");
				onOpen?.(ev);
			});

			es.addEventListener("error", ev => {
				$status.set("error");
				onError?.(ev);
			});

			// Wire all statically declared event types
			if (staticHandlers) {
				for (const type of Object.keys(staticHandlers)) {
					es.addEventListener(type, makeEventListener(type));
				}
			}

			// Wire any runtime listeners already registered before connect
			for (const type of runtimeListeners.keys()) {
				if (!(staticHandlers as Record<string, unknown> | undefined)?.[type]) {
					es.addEventListener(type, makeEventListener(type));
				}
			}
		}

		function closeConnection(): void {
			if (!es) {
				return;
			}
			es.close();
			es = undefined;
			$status.set("closed");
		}

		// ── Public controller ─────────────────────────────────────────────────

		const controller: SSEController<TEvents> = {
			get status() {
				return $status as () => SSEStatus;
			},
			get lastEvent() {
				return $lastEvent as () => SSELastEvent | null;
			},
			connect() {
				const url = getUrl();
				if (!url) {
					return;
				}
				lastUrl = url;
				openConnection(url);
			},
			disconnect() {
				lastUrl = undefined;
				closeConnection();
			},
			on<K extends keyof TEvents & string>(event: K, handler: SSEEventHandler<TEvents[K]>): () => void {
				let set = runtimeListeners.get(event);
				if (!set) {
					set = new Set();
					runtimeListeners.set(event, set as Set<SSEEventHandler<unknown>>);
					// Wire event on live connection if not already covered by static handlers
					if (es && !staticHandlers?.[event]) {
						es.addEventListener(event, makeEventListener(event));
					}
				}
				(set as Set<SSEEventHandler<TEvents[K]>>).add(handler);

				return () => {
					(set as Set<SSEEventHandler<TEvents[K]>>).delete(handler);
				};
			},
		};

		// ── Lifecycle hooks ───────────────────────────────────────────────────

		return {
			hooks: {
				hostConnected() {
					if (Build.isServer) {
						return;
					}
					if (!autoConnect) {
						return;
					}
					const url = getUrl();
					if (!url) {
						return;
					}
					lastUrl = url;
					openConnection(url);
				},
				hostDidRender() {
					if (!autoReconnect) {
						return;
					}
					const url = getUrl() ?? null;
					if (url === (lastUrl ?? null)) {
						return;
					}
					lastUrl = url ?? undefined;
					if (url) {
						openConnection(url);
					} else {
						closeConnection();
					}
				},
				hostDisconnected() {
					closeConnection();
					lastUrl = undefined;
				},
			},
			value: controller,
		};
	});
}
