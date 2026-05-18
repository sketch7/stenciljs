import { clearCurrentHost, setCurrentHost } from "../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../hooks/reactive-controller";

/**
 * Minimal host for unit-testing hooks and controllers without the Stencil runtime.
 *
 * @example
 * ```ts
 * let host: TestHost;
 * beforeEach(() => { host = new TestHost(); });
 * afterEach(() => { host.dispose(); });
 * ```
 */
export class TestHost implements ReactiveControllerHost {
	readonly controllers = new Set<ReactiveController>();
	renderCount = 0;

	constructor() {
		setCurrentHost(this);
	}

	addController(ctrl: ReactiveController): void {
		this.controllers.add(ctrl);
	}

	removeController(ctrl: ReactiveController): void {
		this.controllers.delete(ctrl);
	}

	/** Simulates `componentWillRender` → `hostWillRender` on each controller. */
	render(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostWillRender?.();
		}
	}

	/** Simulates a re-render triggered by `requestUpdate`. Increments `renderCount` then runs the render cycle. */
	requestUpdate(): void {
		this.renderCount++;
		this.render();
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
			const result = ctrl.hostWillLoad?.();
			if (result) {
				promises.push(result);
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

	/** Clears the host context. Call in `afterEach` to clean up between tests. */
	dispose(): void {
		clearCurrentHost();
	}
}
