import { Build, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { createContext, provideContext, useContext } from "../context";
import { use } from "../hooks/use";
import { createLogger } from "../internal";

const log = createLogger("transfer-state");

const SCRIPT_TYPE = "application/json";

/**
 * Returns `true` when running on the server (SSR).
 *
 * Two-signal detection covers all execution contexts:
 * - `Build.isServer` — `true` inside Stencil's `hydrateAppClosure`; the primary signal for
 *   Stencil SSR. In the hydrate runtime `window` is always available (mock provided by the
 *   runtime), so a `window` presence check is not reliable for Stencil SSR detection.
 * - `!("window" in globalThis)` — `true` in plain Node.js without a DOM environment, enabling
 *   use of this utility outside the Stencil hydrate bundle.
 *
 * @example
 * ```ts
 * if (detectServer()) {
 *   // server-only path
 * }
 * ```
 */
export const detectServer: () => boolean = () => Build.isServer || !("window" in globalThis);

/**
 * Returns the DOM `id` for the transfer-state `<script>` element.
 *
 * @internal
 */
export function scriptId(id: string): string {
	return `__ssv-state__${id}`;
}

/**
 * Typed transfer key. Create with {@link makeTransferKey}.
 *
 * @example
 * ```ts
 * export const POSTS_KEY = makeTransferKey<Post[]>('posts');
 * ```
 */
export type TransferKey<T> = string & { readonly __tsType?: T };

/**
 * Creates a typed key for use with {@link provideTransferState} and {@link useTransferState}.
 *
 * @example
 * ```ts
 * export const TIME_KEY = makeTransferKey<string>('time');
 * ```
 */
export function makeTransferKey<T>(key: string): TransferKey<T> {
	return key as TransferKey<T>;
}

/**
 * Transfer state API — available to both providers and consumers.
 *
 * Obtain via {@link provideTransferState} (provider) or {@link useTransferState} (consumer).
 */
export type TransferState = {
	/** Returns the stored value for `key`, or `defaultValue` if absent. */
	get: <T>(key: TransferKey<T>, defaultValue?: T) => T | undefined;
	/** Stores `value` for `key`. */
	set: <T>(key: TransferKey<T>, value: T) => void;
	/**
	 * Registers a lazy factory for `key` — called at serialization time rather than at registration time.
	 *
	 * The factory is **never called on the client**.
	 * If both `set()` and `setLazy()` target the same key, the lazy value takes precedence in
	 * the serialized output.
	 *
	 * @example
	 * ```ts
	 * // Value captured at serialization time, not when setup() runs.
	 * ts.setLazy(MY_KEY, () => expensiveCompute());
	 * ```
	 */
	setLazy: <T>(key: TransferKey<T>, factory: () => T) => void;
	/**
	 * Server: calls `getValue()`, stores the result, and returns it.
	 * Client: returns the value read from the serialized script tag (or `undefined` if absent).
	 */
	transfer: <T>(key: TransferKey<T>, getValue: () => T) => T | undefined;
	/**
	 * Returns a `<script type="application/json">` VNode for explicit placement in `render()`.
	 * **Server only** — returns `null` on the client and when no `id` is set (global no-op state).
	 *
	 * `provideTransferState` auto-injects this script as the last child of the shadow root in
	 * `componentDidLoad`, so calling this method is **optional**. Use it only when you need
	 * explicit control over script placement within the shadow DOM.
	 *
	 * @example
	 * ```tsx
	 * render() {
	 *   return <>{this.#ts.toScriptElement()}<div>…</div></>;
	 * }
	 * ```
	 */
	toScriptElement: () => VNode | null;
};

class TransferStateImpl implements TransferState {
	readonly #id: string | undefined;
	readonly #map = new Map<string, unknown>();
	readonly #lazy = new Map<string, () => unknown>();

	constructor(id: string | undefined) {
		this.#id = id;
	}

	get<T>(key: TransferKey<T>, defaultValue?: T): T | undefined {
		return this.#map.has(key) ? (this.#map.get(key) as T) : defaultValue;
	}

	set<T>(key: TransferKey<T>, value: T): void {
		this.#map.set(key, value);
	}

	setLazy<T>(key: TransferKey<T>, factory: () => T): void {
		this.#lazy.set(key, factory as () => unknown);
	}

	transfer<T>(key: TransferKey<T>, getValue: () => T): T | undefined {
		if (detectServer()) {
			const v = getValue();
			this.#map.set(key, v);
			return v;
		}
		return this.get(key);
	}

	/** @internal */
	toJSON(): string {
		const entries = new Map(this.#map);
		for (const [k, factory] of this.#lazy) {
			entries.set(k, factory());
		}
		const raw = JSON.stringify(Object.fromEntries(entries));
		// Escape script tag to avoid break out of <script> tag in serialized output.
		// Encoding of `<` is the same behavior as G3 script_builders.
		// Encoding of `/` prevents crawlers from incorrectly indexing relative URLs in inline JSON.
		return raw.replaceAll("<", String.raw`\u003C`).replaceAll("/", String.raw`\u002F`);
	}

	/** @internal */
	fromJSON(json: string): void {
		let data: Record<string, unknown>;
		try {
			data = JSON.parse(json) as Record<string, unknown>;
		} catch {
			console.error(" [transferState] Failed to parse JSON:", { json });
			return;
		}
		for (const [k, v] of Object.entries(data)) {
			this.#map.set(k, v);
		}
	}

	toScriptElement(): VNode | null {
		if (!this.#id || !detectServer()) {
			return null;
		}
		// String child creates a text node — serialized verbatim inside <script> (NON_ESCAPABLE_CONTENT).
		// oxlint-disable-next-line typescript/no-explicit-any, typescript/no-unsafe-argument -- Stencil h() requires any for non-intrinsic element names
		return h("script" as any, { type: SCRIPT_TYPE, id: scriptId(this.#id) } as any, this.toJSON());
	}
}

// Global no-op singleton — fallback when no ancestor provider exists.
// Has no id, so toScriptElement() always returns null.
const _globalState = new TransferStateImpl(undefined);

/** @internal */
export const TransferStateContext = createContext<TransferState>(() => _globalState, { name: "transfer-state" });

/**
 * Registers the current component as a `TransferState` provider.
 *
 * Creates a scoped state keyed by `id`, provides it to descendants via context, and:
 * - **Server**: auto-injects a `<script type="application/json">` as the last child of the
 *   shadow root in `componentDidLoad` (after all descendants have completed).
 * - **Client**: reads + removes the serialized `<script>` from `shadowRoot` on connect.
 *
 * @example
 * ```ts
 * readonly #ts = provideTransferState('my-scope');
 *
 * render() {
 *   const value = this.#ts.transfer(MY_KEY, () => computeOnServer());
 *   return <div>{value}</div>;
 * }
 * ```
 */
export function provideTransferState(id: string): TransferState {
	const state = new TransferStateImpl(id);

	provideContext(TransferStateContext, state);

	use(host => ({
		hostConnected() {
			if (detectServer()) {
				return;
			}
			const script = host.getElement().shadowRoot?.querySelector(`#${scriptId(id)}`) as HTMLScriptElement | null;
			if (script?.type === SCRIPT_TYPE) {
				log.log(() => `[${id}] hostConnected  client: loaded state from script tag`);
				state.fromJSON(script.textContent ?? "{}");
				script.remove();
			}
		},
		hostDidLoad() {
			if (!detectServer()) {
				return;
			}
			// Stencil SSR guarantees that a parent's componentDidLoad fires only after ALL
			// descendants have resolved (children push their $onReadyPromise$ into parent["s-p"]).
			// Re-serializing here captures lazy values (e.g. dehydrate(queryClient)) that were
			// populated by children's hostWillLoad — which run after the parent's render().
			const shadowRoot = host.getElement().shadowRoot;
			if (!shadowRoot) {
				return;
			}
			let script = shadowRoot.querySelector<HTMLScriptElement>(`#${scriptId(id)}`);
			if (!script) {
				log.log(() => `[${id}] hostDidLoad  server: creating and injecting state script`);
				script = document.createElement("script");
				script.type = SCRIPT_TYPE;
				script.id = scriptId(id);
				shadowRoot.append(script);
			} else {
				log.log(() => `[${id}] hostDidLoad  server: updating existing state script`);
			}
			script.textContent = state.toJSON();
		},
	}));

	return state;
}

/**
 * Consumes the nearest ancestor's `TransferState` via context.
 * Falls back to a global no-op instance when no provider exists in the ancestor tree.
 *
 * Returns a `TransferState` proxy. Use `transfer(key, getValue)` to read server values on the client.
 *
 * @example
 * ```ts
 * const ts = useTransferState();
 * const posts = ts.transfer(POSTS_KEY, () => []);
 * ```
 */
export function useTransferState(): TransferState {
	const ref = useContext(TransferStateContext);
	return {
		get<T>(key: TransferKey<T>, defaultValue?: T): T | undefined {
			return ref.current.get(key, defaultValue);
		},
		set<T>(key: TransferKey<T>, value: T): void {
			ref.current.set(key, value);
		},
		setLazy<T>(key: TransferKey<T>, factory: () => T): void {
			ref.current.setLazy(key, factory);
		},
		transfer<T>(key: TransferKey<T>, getValue: () => T): T | undefined {
			return ref.current.transfer(key, getValue);
		},
		toScriptElement(): VNode | null {
			return ref.current.toScriptElement();
		},
	};
}
