import { Build, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { createContext, provideContext, useContext } from "../context";
import { use } from "../hooks/use";

const SCRIPT_TYPE = "application/json";

/**
 * Returns `true` when running on the server (SSR).
 *
 * Two-signal detection covers all execution contexts:
 * - `typeof window === "undefined"` — `true` in Vitest / plain Node.js (no window global) and in
 *   the outermost `hydrateFactory` scope. In real browsers `window` is always defined.
 * - `Build.isServer` — `true` inside Stencil's `hydrateAppClosure` where
 *   `const window = $stencilWindow` shadows the global, making `typeof window` unreliable.
 *
 * @internal
 */
export const detectServer: () => boolean = () => !("window" in globalThis) || Build.isServer;

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
	get<T>(key: TransferKey<T>, defaultValue?: T): T | undefined;
	/** Stores `value` for `key`. */
	set<T>(key: TransferKey<T>, value: T): void;
	/**
	 * Server: calls `getValue()`, stores the result, and returns it.
	 * Client: returns the value read from the serialized script tag (or `undefined` if absent).
	 */
	transfer<T>(key: TransferKey<T>, getValue: () => T): T | undefined;
	/**
	 * Returns a `<script type="application/json">` VNode for inclusion in the provider's `render()`.
	 * **Server only** — returns `null` on the client and when no `id` is set (global no-op state).
	 *
	 * Must be placed in the provider component's render output so the data reaches the shadow DOM.
	 *
	 * @example
	 * ```tsx
	 * render() {
	 *   return <>{this.#ts.toScriptElement()}<div>…</div></>;
	 * }
	 * ```
	 */
	toScriptElement(): VNode | null;
};

class TransferStateImpl implements TransferState {
	readonly #id: string | undefined;
	readonly #map = new Map<string, unknown>();

	constructor(id: string | undefined) {
		this.#id = id;
	}

	get<T>(key: TransferKey<T>, defaultValue?: T): T | undefined {
		return this.#map.has(key) ? (this.#map.get(key) as T) : defaultValue;
	}

	set<T>(key: TransferKey<T>, value: T): void {
		this.#map.set(key, value);
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
		const raw = JSON.stringify(Object.fromEntries(this.#map));
		// Double every backslash so `\n` (JSON escape for newline) survives JS template-literal
		// embedding — @stencil/ssr wraps the shadow-DOM HTML in a backtick template literal,
		// which would otherwise interpret `\n` as an actual newline and break JSON.parse.
		return raw.replaceAll("\\", String.raw`\\`).replaceAll(/<\/script/gi, String.raw`<\/script`);
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Creates a scoped state keyed by `id`, provides it to descendants via context, and on the
 * client reads + removes the serialized `<script>` from `shadowRoot`.
 *
 * Returns the `TransferState` instance. Include `{this.#ts.toScriptElement()}` in `render()` to
 * emit the script into the shadow DOM during SSR.
 *
 * @example
 * ```ts
 * readonly #ts = provideTransferState('my-scope');
 *
 * render() {
 *   const value = this.#ts.transfer(MY_KEY, () => computeOnServer());
 *   return <>{this.#ts.toScriptElement()}<div>{value}</div></>;
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
			const script = host.shadowRoot?.querySelector(`#${scriptId(id)}`) as HTMLScriptElement | null;
			if (script?.type === SCRIPT_TYPE) {
				state.fromJSON(script.textContent ?? "{}");
				script.remove();
			}
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
		transfer<T>(key: TransferKey<T>, getValue: () => T): T | undefined {
			return ref.current.transfer(key, getValue);
		},
		toScriptElement(): VNode | null {
			return ref.current.toScriptElement();
		},
	};
}
