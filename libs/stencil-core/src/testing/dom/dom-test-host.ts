import { clearCurrentHost, setCurrentHost } from "../../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../../hooks/reactive-controller";

/**
 * HTML-element-based host for testing controllers that require real DOM hierarchy and event bubbling.
 *
 * Use when testing context resolution where `CONTEXT_EVENT` must bubble through the DOM tree,
 * or any scenario that requires controlling initialization order (e.g. bottom-up DSD hydration).
 * For pure lifecycle tests without DOM hierarchy, prefer {@link TestHost}.
 *
 * @example
 * ```ts
 * const providerEl = new DomTestHost();
 * provideContext(MyCtx, value);
 * const consumerEl = new DomTestHost();
 * const ref = useContext(MyCtx);
 * clearCurrentHost();
 *
 * providerEl.append(consumerEl);
 * document.body.append(providerEl);
 * providerEl.connect();
 * consumerEl.connect();
 * ```
 */
export class DomTestHost extends HTMLElement implements ReactiveControllerHost {
	readonly controllers = new Set<ReactiveController>();
	renderCount = 0;

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

	/** Simulates `disconnectedCallback` → `hostDisconnected` on each controller. */
	disconnect(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostDisconnected?.();
		}
	}

	/** Clears the host context. Call after all hooks are registered in setup. */
	dispose(): void {
		clearCurrentHost();
	}
}

if (typeof customElements !== "undefined" && !customElements.get("ssv-dom-test-host")) {
	customElements.define("ssv-dom-test-host", DomTestHost);
}
