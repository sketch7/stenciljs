/**
 * @ssv/stencil-signals — mixins/signal-watcher.ts
 *
 * `SignalWatcher` makes any StencilJS component automatically re-render
 * whenever a TC39 signal accessed during the last render cycle changes.
 *
 * It is a standard MixinFactory and works with BOTH usage patterns:
 *
 * ─── Pattern 1: Stencil v4.37+ Mixin() — compose with other mixins ───────────
 *
 * ```ts
 * import { Component, Mixin, h } from '@stencil/core';
 * import { SignalWatcher } from '@ssv/stencil-signals';
 * import { LoggingMixin } from './logging-mixin';
 *
 * @Component({ tag: 'my-counter' })
 * export class MyCounter extends Mixin(SignalWatcher, LoggingMixin) {
 *   componentDidLoad() {
 *     super.componentDidLoad(); // Required when using Mixin()
 *   }
 *   render() { return <p>{count.get()}</p>; }
 * }
 * ```
 *
 * ─── Pattern 2: Direct extension — no other mixins needed ────────────────────
 *
 * ```ts
 * @Component({ tag: 'my-counter' })
 * export class MyCounter extends SignalWatcher(class {}) {
 *   render() { return <p>{count.get()}</p>; }
 * }
 * ```
 *
 * ─── Memory safety ────────────────────────────────────────────────────────────
 *
 * Follows @lit-labs/signals' pattern: the Watcher notify callback must NOT
 * close over `this` (the component). A reference cycle
 *
 *   component → watcher (strong) → component (closure capture)
 *
 * would prevent GC even after the component is removed from the DOM.
 *
 * We break the cycle using:
 *  - `componentForWatcher: WeakMap<Watcher, ComponentEntry>` — the callback
 *    only captures the Watcher (`this` in a regular `function()`) and the
 *    module-level WeakMap, never the component directly.
 *  - `watcherFinalizationRegistry` — if the component is GC'd before
 *    `disconnectedCallback` fires (e.g. detached subtrees), the registry
 *    cleans up the watcher automatically.
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
import { Signal as TC39Signal } from "signal-polyfill";

import { scheduler } from "../signals/core";

// ─── Memory management ────────────────────────────────────────────────────────
//
// The Watcher notify callback is a regular `function()` — `this` inside it
// refers to the Watcher instance, NOT the component. The component is looked
// up via the WeakMap so no strong reference from watcher → component exists.

type WatcherEntry = {
	/** Whether the component is currently connected to the DOM. */
	connected: boolean;
	/** The component instance (only needed to pass to forceUpdate). */
	self: object;
};

const componentForWatcher = new WeakMap<InstanceType<typeof TC39Signal.subtle.Watcher>, WatcherEntry>();

const watcherFinalizationRegistry = new FinalizationRegistry<InstanceType<typeof TC39Signal.subtle.Watcher>>(
	watcher => {
		// Component was GC'd — detach all signals so the watcher itself can be
		// released (signals hold strong refs to their watchers).
		for (const sig of TC39Signal.subtle.introspectSources(watcher)) {
			try {
				watcher.unwatch(sig);
			} catch {
				/* already unwatched */
			}
		}
	},
);

// ─── Mixin ────────────────────────────────────────────────────────────────────

/**
 * MixinFactory that adds TC39 signal reactivity to a StencilJS component.
 *
 * Compatible with Stencil's `Mixin()` helper (v4.37+) and with direct
 * `extends SignalWatcher(class {})` usage — same export, both work.
 */
// Stencil lifecycle shape expected by this mixin (all members optional so
// plain `class {}` bases still satisfy the constraint).
type StencilLike = {
	connectedCallback?(): void;
	disconnectedCallback?(): void;
	render?(): unknown;
};

/** Public surface added by SignalWatcher to any component. */
export type SignalWatcherApi = {
	updateEffect(fn: () => void): () => void;
};

export function SignalWatcher<TBase extends MixedInCtor<StencilLike>>(
	Base: TBase,
): TBase & MixedInCtor<SignalWatcherApi> {
	class SignalWatcherMixin extends Base {
		/** Signals watched during the most recent render pass. */
		private __watchedSignals = new Set<object>();
		/** Active render-tracking watcher; rebuilt each render, disposed on disconnect. */
		private __watcher: InstanceType<typeof TC39Signal.subtle.Watcher> | null = null;
		/** Guard: suppress forceUpdate calls before the element is connected. */
		private __connected = false;
		/** Guard: tracking render wrapper installed once per instance. */
		private __renderInstalled = false;

		connectedCallback(): void {
			this.__connected = true;

			if (!this.__renderInstalled) {
				// ── Install tracking render wrapper (first connection only) ──────────
				//
				// The mixin's own `render()` sits *below* the component's `render()`
				// in the prototype chain, so Stencil always calls the component's
				// render directly and the mixin render is never reached.
				//
				// Fix: at this point `this.render` resolves to the component's JSX
				// render (e.g. CounterDemo.prototype.render) via prototype lookup.
				// We capture it and shadow it with an instance own-property that
				// also sets up the TC39Signal.subtle.Watcher on every render.
				this.__renderInstalled = true;
				const jsxRender = this.render as () => unknown;
				this.render = (): unknown => this.__trackedRender(jsxRender);
			} else if (this.__watcher) {
				// DOM move (disconnect + re-append in the same task): keep the
				// existing watcher alive — just update its connected flag.
				const entry = componentForWatcher.get(this.__watcher);
				if (entry) {
					entry.connected = true;
				}
			} else {
				// True disconnect followed by reconnect: the watcher was disposed.
				// Force a re-render so signal subscriptions are re-established.
				scheduler.schedule(() => {
					if (this.__connected) {
						forceUpdate(this);
					}
				});
			}

			super.connectedCallback?.();
		}

		disconnectedCallback(): void {
			this.__connected = false;
			// Keep the WeakMap entry's connected flag current so a pending notify
			// callback doesn't schedule a forceUpdate after disconnect.
			if (this.__watcher) {
				const entry = componentForWatcher.get(this.__watcher);
				if (entry) {
					entry.connected = false;
				}
			}
			// Use queueMicrotask so DOM moves (remove + re-append in the same task,
			// as `repeat()` does) don't prematurely dispose the watcher.
			queueMicrotask(() => {
				if (!this.__connected) {
					this.__disposeWatcher();
				}
			});
			super.disconnectedCallback?.();
		}

		/** Sets up a Signal.Watcher around the component's JSX render. */
		private __trackedRender(jsxRender: () => unknown): unknown {
			// Tear down the previous watcher so deps are always re-collected fresh.
			this.__disposeWatcher();
			const newlyWatched = new Set<object>();

			// Regular `function()` so `this` inside = the Watcher, not the component.
			// The component is looked up via componentForWatcher (WeakMap) — no
			// strong reference from watcher → component.
			const watcher = new TC39Signal.subtle.Watcher(
				function watcher(this: InstanceType<typeof TC39Signal.subtle.Watcher>) {
					const entry = componentForWatcher.get(this);
					if (entry === undefined) {
						return;
					} // component was GC'd
					// NOTE: Do NOT call this.watch() here. The TC39 spec forbids
					// calling watch() during the notification phase — it triggers
					// producerAccessed and throws. Since __trackedRender disposes
					// and recreates this Watcher on every render, re-arming is
					// unnecessary: the new Watcher re-subscribes from scratch.
					if (entry.connected) {
						scheduler.schedule(() => forceUpdate(entry.self));
					}
				},
			);

			this.__watcher = watcher;
			componentForWatcher.set(watcher, {
				connected: this.__connected,
				self: this as unknown as object,
			});
			watcherFinalizationRegistry.register(this, watcher);

			// Wrap jsxRender in a Computed so every signal.get() call is tracked.
			let renderResult: unknown;
			const tracker = new TC39Signal.Computed(() => {
				renderResult = jsxRender.call(this);
				return renderResult;
			});

			tracker.get();

			for (const dep of TC39Signal.subtle.introspectSources(tracker)) {
				watcher.watch(dep);
				newlyWatched.add(dep);
			}

			this.__watchedSignals = newlyWatched;

			// Keep the WeakMap entry's `connected` flag in sync.
			const entry = componentForWatcher.get(watcher);
			if (entry) {
				entry.connected = this.__connected;
			}

			return renderResult;
		}

		/**
		 * Run `fn` whenever any signal it accesses changes.
		 *
		 * Mirrors @lit-labs/signals' `updateEffect()` adapted for Stencil:
		 * effects are scheduled through the same micro-task scheduler used for
		 * re-renders, so they coalesce with any pending forceUpdate.
		 *
		 * ```ts
		 * connectedCallback() {
		 *   this._cleanup = this.updateEffect(() => {
		 *     document.title = `count: ${count.get()}`;
		 *   });
		 * }
		 * disconnectedCallback() { this._cleanup?.(); }
		 * ```
		 *
		 * @returns A disposal function. Call it to stop the effect.
		 */
		updateEffect(fn: () => void): () => void {
			let disposed = false;

			const effectSignal = new TC39Signal.Computed<null>(() => {
				fn();
				return null;
			});

			const effectWatcher = new TC39Signal.subtle.Watcher(
				function (this: InstanceType<typeof TC39Signal.subtle.Watcher>) {
					if (disposed) {
						return;
					}
					// Do NOT call watch() here — forbidden during the notification phase.
					// Re-arming is done inside the scheduled microtask below.
					scheduler.schedule(() => {
						if (!disposed) {
							effectWatcher.unwatch(effectSignal);
							TC39Signal.subtle.untrack(() => effectSignal.get());
							effectWatcher.watch(effectSignal);
							for (const dep of TC39Signal.subtle.introspectSources(effectSignal)) {
								effectWatcher.watch(dep);
							}
						}
					});
				},
			);

			// Initial untracked read to arm the watcher without scheduling a render.
			TC39Signal.subtle.untrack(() => effectSignal.get());
			effectWatcher.watch(effectSignal);
			for (const dep of TC39Signal.subtle.introspectSources(effectSignal)) {
				effectWatcher.watch(dep);
			}

			return () => {
				disposed = true;
				for (const dep of TC39Signal.subtle.introspectSources(effectSignal)) {
					try {
						effectWatcher.unwatch(dep);
					} catch {
						/* ok */
					}
				}
				try {
					effectWatcher.unwatch(effectSignal);
				} catch {
					/* ok */
				}
			};
		}

		private __disposeWatcher(): void {
			if (this.__watcher) {
				for (const sig of this.__watchedSignals) {
					try {
						this.__watcher.unwatch(sig);
					} catch {
						/* already gone */
					}
				}
				this.__watcher = null;
			}
			this.__watchedSignals = new Set();
		}
	}

	return SignalWatcherMixin as unknown as TBase & MixedInCtor<SignalWatcherApi>;
}
