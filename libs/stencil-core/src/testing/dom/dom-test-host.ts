import { clearCurrentHost, setCurrentHost } from "../../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../../hooks/reactive-controller";

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
	readonly controllers: Set<ReactiveController> = new Set<ReactiveController>();
	renderCount: number = 0;
	#disconnected = false;

	constructor() {
		super();
		setCurrentHost(this);
	}

	addController(ctrl: ReactiveController): void {
		this.controllers.add(ctrl);
	}

	removeController(ctrl: ReactiveController): void {
		this.controllers.delete(ctrl);
	}

	requestUpdate(): void {
		this.renderCount++;
	}

	/** Simulates `connectedCallback` → `hostConnected` on each controller. */
	connect(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostConnected?.();
		}
	}

	/** Simulates `componentWillLoad` → `hostWillLoad` on each controller (awaits promises). */
	async willLoad(): Promise<void> {
		const promises: Promise<void>[] = [];
		for (const ctrl of this.controllers) {
			const r = ctrl.hostWillLoad?.();
			if (r) {
				promises.push(r);
			}
		}
		if (promises.length > 0) {
			await Promise.all(promises);
		}
	}

	/** Simulates `disconnectedCallback` → `hostDisconnected` on each controller. Idempotent. */
	disconnect(): void {
		if (this.#disconnected) {
			return;
		}
		this.#disconnected = true;
		for (const ctrl of this.controllers) {
			ctrl.hostDisconnected?.();
		}
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
