/**
 * @ssv/stencil-signals — mixins/signal-watcher.ts
 *
 * Unified `SignalWatcher` facade — works with whichever backend was activated
 * by the entry point (TC39 or Preact). Delegates entirely to the adapter layer
 * via `getAdapter().createEffect()` so no backend-specific imports are needed.
 *
 * Exported by the default entry point ("@ssv/stencil-signals").
 * The backend-specific entry points (/tc39 and /preact) export their own
 * implementations instead — see signal-watcher-tc39.ts / signal-watcher-preact.ts.
 *
 * ─── How it works ─────────────────────────────────────────────────────────────
 *
 * Each call to `render()` disposes any previous tracking effect, then creates a
 * fresh effect via `getAdapter().createEffect()` that:
 *  - On its first (synchronous) run: calls `super.render()` to collect all
 *    signal reads as subscriptions.
 *  - On subsequent runs (a dep changed): schedules a `forceUpdate()` via the
 *    shared microtask scheduler.
 *
 * ─── updateEffect() ───────────────────────────────────────────────────────────
 *
 * ```ts
 * connectedCallback() {
 *   this._cleanup = this.updateEffect(() => {
 *     document.title = `count: ${count.get()}`;
 *   });
 * }
 * disconnectedCallback() { this._cleanup?.(); }
 * ```
 */

import { forceUpdate } from "@stencil/core";
import type { MixedInCtor } from "@stencil/core";

import { getAdapter } from "../adapters/active";
import { scheduler, setActiveOwner } from "../signals/core";

// ─── Types ────────────────────────────────────────────────────────────────────

type StencilLike = {
	connectedCallback?(): void;
	disconnectedCallback?(): void;
	render?(): unknown;
};

/** Public surface added by SignalWatcher to any component. */
export type SignalWatcherApi = {
	updateEffect(fn: () => void): () => void;
};

/**
 * Lifecycle-managed watcher entry registered by watcher utilities when a
 * component host is passed as argument. The host disposes on disconnect and
 * reinits on reconnect automatically.
 */
export type WatcherEntry = {
	dispose(): void;
	reinit(): void;
};

/**
 * Interface implemented by SignalWatcher components. Passed as the optional
 * `host` argument to `computedAsync`, `computedPrevious`, and `effect` to
 * enable automatic dispose-on-disconnect / reinit-on-reconnect.
 *
 * @example
 * ```ts
 * readonly user = computedAsync(fn, this);
 * readonly prev = computedPrevious(source, this);
 * effect(fn, this);
 * ```
 */
export type WatcherRegistrar = {
	/** @internal */
	__addWatcher(entry: WatcherEntry): void;
};

// ─── Mixin ────────────────────────────────────────────────────────────────────

export function SignalWatcher<TBase extends MixedInCtor<StencilLike>>(
	Base: TBase,
): TBase & MixedInCtor<SignalWatcherApi & WatcherRegistrar> {
	class SignalWatcherMixin extends Base {
		/** Cleanup for the current render-tracking effect. */
		private __disposeEffect: (() => void) | null = null;
		/** Guard: suppress forceUpdate calls before the element is connected. */
		private __connected = false;
		/** Guard: tracking render wrapper installed once per instance. */
		private __renderInstalled = false;
		/** Dispose fns for all watcher utilities created during connectedCallback. */
		private __scopeCleanups: (() => void)[] = [];
		/** Watcher entries registered via class property initializers (host path). */
		private __watcherRegistry: WatcherEntry[] = [];

		/**
		 * Register a watcher entry created outside connectedCallback (e.g. as a
		 * class property initializer). The component will call `dispose()` on
		 * disconnection and `reinit()` on reconnection automatically.
		 */
		__addWatcher(entry: WatcherEntry): void {
			this.__watcherRegistry.push(entry);
		}

		connectedCallback(): void {
			this.__connected = true;

			// Reinit any watchers that were disposed on the previous disconnect.
			// On first connect they are still live — reinit() is a no-op in that case.
			for (const entry of this.__watcherRegistry) {
				entry.reinit();
			}

			// Activate the owner scope so any watcher utility (effect,
			// computedAsync, computedPrevious) called in this connectedCallback —
			// before OR after super — auto-registers its dispose fn.
			// Clear via microtask so ordering relative to super doesn't matter.
			setActiveOwner(this.__scopeCleanups);
			queueMicrotask(() => setActiveOwner(null));

			if (!this.__renderInstalled) {
				this.__renderInstalled = true;
				const jsxRender = this.render as () => unknown;

				this.render = (): unknown => {
					this.__disposeEffect?.();
					this.__disposeEffect = null;

					let renderResult: unknown;
					let firstRun = true;

					this.__disposeEffect = getAdapter().createEffect(() => {
						if (firstRun) {
							firstRun = false;
							renderResult = jsxRender.call(this);
						} else if (this.__connected) {
							scheduler.schedule(() => forceUpdate(this));
						}
					});

					return renderResult;
				};
			}

			super.connectedCallback?.();
		}

		disconnectedCallback(): void {
			this.__connected = false;

			// Dispose all watcher utilities collected during connectedCallback.
			for (const cleanup of this.__scopeCleanups) {
				cleanup();
			}
			this.__scopeCleanups = [];

			// Dispose class-property watchers registered via __addWatcher.
			// The registry itself is kept so entries can be reinited on reconnect.
			for (const entry of this.__watcherRegistry) {
				entry.dispose();
			}

			// queueMicrotask so DOM moves (remove + re-append in the same task)
			// don't prematurely dispose the tracking effect.
			queueMicrotask(() => {
				if (!this.__connected) {
					this.__disposeEffect?.();
					this.__disposeEffect = null;
				}
			});
			super.disconnectedCallback?.();
		}

		/**
		 * Run `fn` immediately and re-run it whenever any signal it reads changes.
		 * Mirrors @lit-labs/signals' `updateEffect()` adapted for Stencil.
		 *
		 * @returns A disposal function. Call it to stop the effect.
		 */
		updateEffect(fn: () => void): () => void {
			return getAdapter().createEffect(fn);
		}
	}

	return SignalWatcherMixin as unknown as TBase & MixedInCtor<SignalWatcherApi & WatcherRegistrar>;
}
