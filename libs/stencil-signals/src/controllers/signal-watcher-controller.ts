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
 * export class MyCounter extends SsvElement {
 *   readonly signalWatcher = withSignalController(this);
 *   render() { return <p>{count()}</p>; }
 * }
 * ```
 *
 * Tracking strategy (persistent watcher + computed):
 *  - A single `createComputed` wraps `jsxRender()` so every signal read inside
 *    render is tracked as a dependency.
 *  - A single `createWatcher` watches that Computed and fires `requestUpdate()`
 *    when any dependency changes — no per-render allocations.
 *  - `hostWillRender` re-evaluates the Computed before each render and stores the
 *    JSX result; the `render` override simply returns that cached result.
 *  - A version signal is bumped each `hostWillRender` to force-dirty the Computed
 *    for prop/state-triggered renders (where no signal changed).
 *
 */

import { use } from "@ssv/stencil.core";
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

import { getAdapter } from "../adapters/active";
import type { AdapterWatcher, Signal, WritableSignal } from "../adapters/types";
import { scheduler, setActiveOwner } from "../signals/core";

type RenderReactiveControllerHost = ReactiveControllerHost & {
	render?(): unknown;
};

// ─── Controller ───────────────────────────────────────────────────────────────

export class SignalWatcherController implements ReactiveController {
	/** Guard: suppress requestUpdate calls before the element is connected. */
	private __connected = false;
	/** Guard: render override is installed once per controller instance. */
	private __renderInstalled = false;
	/** The original component render fn — captured once on first connect. */
	private __jsxRender: (() => unknown) | null = null;
	/** Persistent watcher — fires when the render Computed becomes dirty. */
	private __watcher: AdapterWatcher | null = null;
	/** Computed wrapping jsxRender — tracks all signal reads during render. */
	private __renderComputed: Signal<unknown> | null = null;
	/** Bumped each hostWillRender to force-dirty the Computed for prop/state-triggered renders. */
	private __versionSignal: WritableSignal<number> | null = null;
	/** JSX result from the most recent evaluation, returned by the render override. */
	private __lastRenderResult: unknown = undefined;
	/** Dispose fns for watcher utilities created while this controller is active. */
	private __scopeCleanups: (() => void)[] = [];

	constructor(private readonly host: RenderReactiveControllerHost) {}

	hostConnected(): void {
		this.__connected = true;

		// Activate the owner scope so watcher utilities (effect, derivedAsync)
		// and use* hooks (via bindToHostLifecycle) register
		// dispose fns here. hostDisconnected flushes __scopeCleanups; use* hooks
		// only snapshot state on their own hostDisconnected.
		setActiveOwner(this.__scopeCleanups);
		queueMicrotask(() => setActiveOwner(null));

		const host = this.host;

		// Install the minimal render override once — actual render work happens in hostWillRender
		if (!this.__renderInstalled) {
			this.__renderInstalled = true;

			// If the host has no render function, there's nothing to track — bail out
			if (!host.render) {
				return;
			}

			// Save the original render fn; host.render will be replaced below
			this.__jsxRender = host.render.bind(host);

			// Trivial override — returns the pre-computed JSX from hostWillRender
			host.render = (): unknown => this.__lastRenderResult;
		}

		if (!this.__jsxRender) {
			return;
		}

		// Dispose any still-alive watcher from a previous connection
		// (guard against DOM moves where the disconnect microtask hasn't fired yet)
		this.__watcher?.dispose();

		const adapter = getAdapter();
		const jsxRender = this.__jsxRender;
		const versionSig = (this.__versionSignal = adapter.createState(0));

		// Wraps jsxRender in a Computed so every signal read inside render is tracked
		this.__renderComputed = adapter.createComputed(() => {
			// Read versionSig so bumping it in hostWillRender forces re-evaluation
			// for prop/state-triggered renders (where no signal changed)
			versionSig();
			return jsxRender();
		});

		// Fires when the Computed becomes dirty (a tracked signal changed)
		this.__watcher = adapter.createWatcher(() => {
			if (this.__connected) {
				scheduler.schedule(() => host.requestUpdate());
			}
		});
	}

	hostWillRender(): void {
		const watcher = this.__watcher;
		const renderComputed = this.__renderComputed;
		const versionSig = this.__versionSignal;

		if (!watcher || !renderComputed || !versionSig) {
			return;
		}

		// Unwatch before bumping version to prevent a spurious watcher notification
		// while forcing the Computed to re-evaluate
		watcher.unwatch(renderComputed);
		// Bump version to force-dirty the Computed for prop/state-triggered renders
		// (where no signal changed, so the Computed would otherwise return its cached value)
		versionSig.set(versionSig.peek() + 1);
		// Re-evaluate: runs jsxRender(), re-tracks all signal reads, stores the JSX
		this.__lastRenderResult = renderComputed.get();
		// Re-arm: watch the Computed for the next signal change
		watcher.watch(renderComputed);
	}

	hostDisconnected(): void {
		this.__connected = false;

		// Dispose all watcher utilities collected during connectedCallback.
		for (const cleanup of this.__scopeCleanups) {
			cleanup();
		}
		this.__scopeCleanups = [];

		// queueMicrotask so DOM moves (remove + re-append in the same task)
		// don't prematurely dispose the watcher.
		queueMicrotask(() => {
			if (!this.__connected) {
				this.__watcher?.dispose();
				this.__watcher = null;
				this.__renderComputed = null;
				this.__versionSignal = null;
				this.__lastRenderResult = undefined;
			}
		});
	}
}

export function useSignalWatcher() {
	return use(host => new SignalWatcherController(host));
}
