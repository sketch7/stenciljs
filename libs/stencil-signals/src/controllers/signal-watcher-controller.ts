/**
 * @ssv/stencil-signals — controllers/signal-watcher-controller.ts
 *
 * `SignalWatcherController` is the composition-pattern counterpart to the
 * `SignalWatcher` mixin. Instead of extending `Mixin(SignalWatcher)`, a
 * component extends its own `ReactiveControllerHost` base class and registers
 * this controller in the constructor:
 *
 * ```ts
 * @Component({ tag: 'my-counter', shadow: false })
 * export class MyCounter extends ReactiveControllerHost {
 *   constructor() {
 *     super();
 *     this.addController(new SignalWatcherController(this));
 *   }
 *   render() { return <p>{count()}</p>; }
 * }
 * ```
 *
 * The controller installs the same render-tracking effect as the mixin:
 *  - First render run: collects signal subscriptions via `getAdapter().createEffect()`
 *  - Subsequent runs (a dep changed): calls `host.requestUpdate()` via scheduler
 *
 * `ReactiveControllerHost` is **not** part of this library — consumers define
 * it themselves (or copy the example in the demo). The controller only requires
 * the `SignalWatcherControllerHost` interface below.
 */

import { getAdapter } from "../adapters/active";
import { scheduler, setActiveOwner } from "../signals/core";

// ─── Host interface ───────────────────────────────────────────────────────────

/**
 * The minimal interface `SignalWatcherController` requires from its host.
 *
 * Your `ReactiveControllerHost` base class already satisfies this — no extra
 * wiring needed. The `render` property is optional because the controller
 * patches it at runtime on first connection.
 */
export type SignalWatcherControllerHost = {
	requestUpdate(): void;
	render?(): unknown;
};

// ─── Controller ───────────────────────────────────────────────────────────────

export class SignalWatcherController {
	/** Cleanup for the current render-tracking effect. */
	private __disposeEffect: (() => void) | null = null;
	/** Guard: suppress requestUpdate calls before the element is connected. */
	private __connected = false;
	/** Guard: render wrapper is installed once per controller instance. */
	private __renderInstalled = false;
	/** Dispose fns for watcher utilities created while this controller is active. */
	private __scopeCleanups: (() => void)[] = [];

	constructor(private readonly __host: SignalWatcherControllerHost) {}

	hostConnected(): void {
		this.__connected = true;

		// Activate the owner scope so any watcher utility (effect,
		// computedAsync, computedPrevious) called in connectedCallback —
		// before OR after this controller is notified — auto-registers its
		// dispose fn and is cleaned up on disconnect.
		setActiveOwner(this.__scopeCleanups);
		queueMicrotask(() => setActiveOwner(null));

		if (!this.__renderInstalled) {
			this.__renderInstalled = true;

			const host = this.__host;
			if (!host.render) {
				return;
			}
			const jsxRender = host.render.bind(host);

			host.render = (): unknown => {
				this.__disposeEffect?.();
				this.__disposeEffect = null;

				let renderResult: unknown;
				let firstRun = true;

				this.__disposeEffect = getAdapter().createEffect(() => {
					if (firstRun) {
						firstRun = false;
						renderResult = jsxRender();
					} else if (this.__connected) {
						scheduler.schedule(() => host.requestUpdate());
					}
				});

				return renderResult;
			};
		}
	}

	hostDisconnected(): void {
		this.__connected = false;

		// Dispose all watcher utilities collected during connectedCallback.
		for (const cleanup of this.__scopeCleanups) {
			cleanup();
		}
		this.__scopeCleanups = [];

		// queueMicrotask so DOM moves (remove + re-append in the same task)
		// don't prematurely dispose the tracking effect.
		queueMicrotask(() => {
			if (!this.__connected) {
				this.__disposeEffect?.();
				this.__disposeEffect = null;
			}
		});
	}
}
