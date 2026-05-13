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
 */

import type { ReactiveControllerHost } from "@ssv/stencil.core";

import { getAdapter } from "../adapters/active";
import { scheduler, setActiveOwner } from "../signals/core";

// ─── Controller ───────────────────────────────────────────────────────────────

export class SignalWatcherController {
	private host: ReactiveControllerHost;

	/** Cleanup for the current render-tracking effect. */
	private __disposeEffect: (() => void) | null = null;
	/** Guard: suppress requestUpdate calls before the element is connected. */
	private __connected = false;
	/** Guard: render wrapper is installed once per controller instance. */
	private __renderInstalled = false;
	/** Dispose fns for watcher utilities created while this controller is active. */
	private __scopeCleanups: (() => void)[] = [];

	constructor(host: ReactiveControllerHost) {
		this.host = host;
		host.addController(this);
	}

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

			// Grab the host reference locally so the closure doesn't capture `this`
			const host = this.host;

			// If the host has no render function, there's nothing to wrap — bail out
			if (!host.render) {
				return;
			}

			// Capture the original render fn bound to host so `this` is correct inside it
			const jsxRender = host.render.bind(host);

			// Replace host.render with our tracking wrapper — called by Stencil each render cycle
			host.render = (): unknown => {
				// Dispose the previous effect before creating a new one,
				// so stale signal subscriptions from the last render don't leak
				this.__disposeEffect?.();
				this.__disposeEffect = null;

				// Will hold the JSX tree returned by jsxRender() to pass back to Stencil
				let renderResult: unknown;

				// Guards the two distinct phases inside the effect callback (see below)
				let firstRun = true;

				// Create a new tracking effect — the adapter records every signal read
				// that occurs synchronously inside this callback as a subscription
				this.__disposeEffect = getAdapter().createEffect(() => {
					if (firstRun) {
						// FIRST run (synchronous): execute the real render inside the effect
						// so all signal reads (e.g. count()) are tracked as subscriptions
						firstRun = false;
						renderResult = jsxRender();
					} else if (this.__connected) {
						// SUBSEQUENT runs (a subscribed signal changed): don't render here —
						// just ask Stencil to schedule a re-render via its normal lifecycle,
						// which will call host.render() again and repeat the whole cycle
						scheduler.schedule(() => host.requestUpdate());
					}
					// If !this.__connected we're disconnected — skip to avoid phantom updates
				});

				console.warn("hello", renderResult);

				// Return the JSX result captured during the first (synchronous) effect run
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

export function withSignalController(host: ReactiveControllerHost): SignalWatcherController {
	return new SignalWatcherController(host);
}
