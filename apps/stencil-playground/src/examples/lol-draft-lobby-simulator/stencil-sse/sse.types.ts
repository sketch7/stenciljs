import type { ContextKey, Ref } from "@ssv/stencil.core";

// ─── Event map ────────────────────────────────────────────────────────────────

/**
 * Maps SSE event names to their parsed payload types.
 * Used as the default type argument — no index signature required when providing a concrete type.
 *
 * @example
 * ```ts
 * type DraftSSEEvents = {
 *   connected:      { phase?: string };
 *   "draft-updated": { phase?: string };
 * };
 * ```
 */
export type SSEEventMap = Record<string, unknown>;

/** Handler invoked when a typed SSE event is received. */
export type SSEEventHandler<T> = (data: T, raw: MessageEvent<string>) => void;

/** Declarative map of typed event handlers. */
export type SSEEventHandlers<TEvents extends object> = {
	[K in keyof TEvents & string]?: SSEEventHandler<TEvents[K]>;
};

// ─── Status ───────────────────────────────────────────────────────────────────

/** Lifecycle state of an SSE connection. */
export type SSEStatus = "idle" | "connecting" | "connected" | "error" | "closed";

// ─── Options ──────────────────────────────────────────────────────────────────

export type SSEOptions<TEvents extends object = SSEEventMap> = {
	/**
	 * Automatically open the connection when the component mounts.
	 * @default true
	 */
	autoConnect?: boolean;
	/**
	 * Automatically reconnect when the URL returned by `getUrl` changes between renders.
	 * A `null`/`undefined` URL closes any open connection.
	 * @default true
	 */
	autoReconnect?: boolean;
	/**
	 * Parse `MessageEvent.data` as JSON before passing it to event handlers.
	 * Set to `false` to receive the raw string.
	 * @default true
	 */
	parseJson?: boolean;
	/** Forwarded to the `EventSource` constructor. */
	withCredentials?: boolean;
	/**
	 * Declarative, type-safe event handlers.
	 *
	 * @example
	 * ```ts
	 * useSSE<{ "draft-updated": DraftUpdate }>(() => url, {
	 *   on: {
	 *     "draft-updated"(data) { client.invalidateQueries({ queryKey: [...] }); }
	 *   }
	 * });
	 * ```
	 */
	on?: SSEEventHandlers<TEvents>;
	/** Called when the connection is opened. */
	onOpen?: (event: Event) => void;
	/** Called when the connection emits an error. */
	onError?: (event: Event) => void;
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Returned by {@link useSSE}. Exposes reactive state and imperative control.
 *
 * `status` and `lastEvent` are signal getters — use `useSignalWatcher()` in the component
 * when you want them to trigger re-renders.
 *
 * @example
 * ```ts
 * useSignalWatcher();
 * const sse = useSSE(() => url);
 *
 * // In render():
 * <span>{sse.status()}</span>
 * ```
 */
export type SSEController<TEvents extends object = SSEEventMap> = {
	/** Signal-backed connection status. */
	readonly status: () => SSEStatus;
	/** Signal-backed last received event, or `null` if none yet. */
	readonly lastEvent: () => SSELastEvent | null;
	/** Manually open (or re-open) the connection. */
	connect(): void;
	/** Close the connection. */
	disconnect(): void;
	/**
	 * Attach a typed event listener at runtime.
	 * Returns an unsubscribe function.
	 *
	 * @example
	 * ```ts
	 * const off = sse.on("draft-updated", data => console.log(data));
	 * off(); // remove listener
	 * ```
	 */
	on<K extends keyof TEvents & string>(event: K, handler: SSEEventHandler<TEvents[K]>): () => void;
};

/** Shape of {@link SSEController.lastEvent}. */
export type SSELastEvent = {
	/** The event name (e.g. `"draft-updated"`). */
	type: string;
	/** The parsed (or raw) event payload. */
	data: unknown;
};

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Opaque typed token for sharing an {@link SSEController} through the component tree.
 * Create with {@link createSSEContext}; pass to {@link provideSSE} and {@link useSSEContext}.
 */
export type SSEContext<TEvents extends object = SSEEventMap> = {
	/** @internal The underlying stencil.core context key. */
	readonly _key: ContextKey<SSEController<TEvents>>;
};

/** A {@link Ref} resolved to an {@link SSEController} from an ancestor {@link provideSSE}. */
export type SSEContextRef<TEvents extends object = SSEEventMap> = Ref<SSEController<TEvents>>;
