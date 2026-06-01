import { clearCurrentHost, setCurrentHost } from "../hooks/host-context";
import type { ReactiveController, ReactiveControllerHost } from "../hooks/reactive-controller";
import { reactiveController } from "../hooks/reactive-controller-ref";

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

	/** Simulates a full render cycle: `componentWillRender` → `hostWillRender`, then `componentDidRender` → `hostDidRender`. */
	render(): void {
		this.#ref.willRender();
		this.#ref.didRender();
	}

	/** Simulates a re-render triggered by `requestUpdate`. Increments `renderCount` then runs the render cycle. */
	requestUpdate(): void {
		this.renderCount++;
		this.render();
	}

	/** Simulates `connectedCallback` → `hostConnected` on each controller. */
	connect(): void {
		this.#ref.connected();
	}

	/** Simulates `componentWillLoad` → `hostWillLoad` on each controller (awaits promises). */
	async willLoad(): Promise<void> {
		await this.#ref.willLoad();
	}

	/** Simulates `componentDidLoad` → `hostDidLoad` on each controller. */
	didLoad(): void {
		this.#ref.didLoad();
	}

	/** Simulates `disconnectedCallback` → `hostDisconnected` on each controller. Idempotent. */
	disconnect(): void {
		if (this.#disconnected) {
			return;
		}
		this.#disconnected = true;
		this.#ref.disconnected();
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
