import { clearCurrentHost, setCurrentHost } from "../../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../../hooks/reactive-controller";
import { reactiveController } from "../../hooks/reactive-controller-ref";

/**
 * HTML-element-based host for testing controllers that require real DOM hierarchy and event bubbling.
 *
 * Use when testing context resolution where `CONTEXT_EVENT` must bubble through the DOM tree,
 * or any scenario that requires controlling initialization order (e.g. bottom-up DSD hydration).
 * For pure lifecycle tests without DOM hierarchy, prefer {@link TestHost}.
 *
 * Use {@link mountDom} to set up a full DOM tree with automatic lifecycle and cleanup.
 * Use `new DomTestHost()` directly when `mountDom` cannot be used (e.g., error-throwing scenarios).
 *
 * @example
 * ```ts
 * using host = new DomTestHost(); // [Symbol.dispose] → disconnect + remove + clearCurrentHost
 * useContext(MyCtx);
 * document.body.append(host);
 * host.connect();
 * await expect(host.willLoad()).rejects.toThrow();
 * ```
 */
export class DomTestHost extends HTMLElement implements ReactiveControllerHost {
	/** Shared registry + lifecycle dispatcher (same engine used by the production mixin). */
	readonly #ref = reactiveController();
	renderCount = 0;
	#disconnected = false;

	/** Live set of registered controllers. */
	readonly controllers: ReadonlySet<ReactiveController> = this.#ref.controllers;

	constructor() {
		super();
		setCurrentHost(this);
	}

	addController(ctrl: ReactiveController): void {
		this.#ref.add(ctrl);
	}

	removeController(ctrl: ReactiveController): void {
		this.#ref.remove(ctrl);
	}

	requestUpdate(): void {
		this.renderCount++;
	}

	/** Simulates `connectedCallback` → `hostConnected` on each controller. */
	connect(): void {
		this.#ref.connected();
	}

	/** Simulates `componentWillLoad` → `hostWillLoad` on each controller (awaits promises). */
	async willLoad(): Promise<void> {
		await this.#ref.willLoad();
	}

	/** Simulates `disconnectedCallback` → `hostDisconnected` on each controller. Idempotent. */
	disconnect(): void {
		if (this.#disconnected) {
			return;
		}
		this.#disconnected = true;
		this.#ref.disconnected();
	}

	/** Clears the host context. Call after all hooks are registered in setup. */
	dispose(): void {
		clearCurrentHost();
	}

	/** Full teardown: `disconnect()`, removes from DOM, then `dispose()`. Enables `using host = new DomTestHost()`. */
	[Symbol.dispose](): void {
		this.disconnect();
		this.remove();
		this.dispose();
	}
}

if (typeof customElements !== "undefined" && !customElements.get("ssv-dom-test-host")) {
	customElements.define("ssv-dom-test-host", DomTestHost);
}
