import { clearCurrentHost, setCurrentHost } from "../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../hooks/reactive-controller";

/**
 * Minimal host for unit-testing hooks and controllers without the Stencil runtime.
 *
 * Use `new TestHost()` directly when a test needs to assert behavior at a specific lifecycle
 * phase. Use {@link mount} for full lifecycle setup with automatic cleanup.
 *
 * @example
 * ```ts
 * // Per-test host with automatic cleanup via `using`:
 * using host = new TestHost();
 * useEffect(() => { ... });
 * host.connect();
 * ```
 */
export class TestHost extends EventTarget implements ReactiveControllerHost {
	readonly controllers = new Set<ReactiveController>();
	renderCount = 0;
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

	/** Simulates a full render cycle: `componentWillRender` → `hostWillRender`, then `componentDidRender` → `hostDidRender`. */
	render(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostWillRender?.();
		}
		for (const ctrl of this.controllers) {
			ctrl.hostDidRender?.();
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

	/** Simulates `componentDidLoad` → `hostDidLoad` on each controller. */
	didLoad(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostDidLoad?.();
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

	/** Clears the host context. Call in `afterEach` to clean up between tests. */
	dispose(): void {
		clearCurrentHost();
	}

	/** Full teardown: `disconnect()` then `dispose()`. Enables `using host = new TestHost()`. */
	[Symbol.dispose](): void {
		this.disconnect();
		this.dispose();
	}
}
