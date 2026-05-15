import { use } from "../hooks/use";

const SCRIPT_TYPE = "application/json";

/** @internal Overridable for testing — returns `true` when running on the server. */
export const detectServer: () => boolean = () => typeof globalThis.requestAnimationFrame === "undefined";

function scriptId(key: string): string {
	return `ssv-ts-${key}`;
}

/** Read-only reference populated with the transferred value on the client, or `undefined` on the server. */
export type TransferStateRef<T> = {
	readonly value: T | undefined;
};

/**
 * Transfers a value from server to client via a `<script type="application/json">` tag injected into
 * `document.head`.
 *
 * On the **server** (`hostWillRender`, first call only) — calls `getServerValue()`, serializes the result,
 * and injects `<script type="application/json" id="ssv-ts-{key}">…</script>` into `document.head`.
 * On the **client** (`hostConnected`) — reads and removes that script tag; the parsed value is available
 * via `ref.value` for any controller that runs `hostConnected` afterward.
 *
 * @param key - Unique identifier. Will be used as `id="ssv-ts-{key}"` on the script tag.
 * @param getServerValue - Called once on the server to produce the value to transfer.
 *
 * @example
 * ```ts
 * const state = useTransferState('my-data', () => fetchedData);
 * use({ hostConnected() { if (state.value) doSomething(state.value); } });
 * ```
 */
export function useTransferState<T>(key: string, getServerValue: () => T): TransferStateRef<T> {
	return use(_host => {
		const ref: { value: T | undefined } = { value: undefined };
		let injected = false;
		const id = scriptId(key);

		return {
			hooks: {
				hostConnected() {
					if (detectServer()) {
						return;
					}
					const script = document.querySelector(`#${id}`) as HTMLScriptElement | null;
					if (script?.type === SCRIPT_TYPE) {
						try {
							ref.value = JSON.parse(script.textContent ?? "") as T;
						} catch {
							// ignore parse errors — treat as no data
						}
						script.remove();
					}
				},
				hostWillRender() {
					if (!detectServer() || injected) {
						return;
					}
					injected = true;
					try {
						const json = JSON.stringify(getServerValue()).replaceAll(/<\/script/gi, String.raw`<\/script`);
						const script = document.createElement("script");
						script.type = SCRIPT_TYPE;
						script.id = id;
						script.textContent = json;
						document.head.append(script);
					} catch {
						// noop — leave ref.value undefined on client
					}
				},
			},
			value: {
				get value() {
					return ref.value;
				},
			} as TransferStateRef<T>,
		};
	});
}
