/**
 * @ssv/stencil-signals — mixins/signal-watcher-preact.ts
 *
 * `SignalWatcher` makes any StencilJS component automatically re-render
 * whenever a Preact signal accessed during the last render cycle changes.
 *
 * Same public API as the TC39 version — only the import path differs.
 *
 * ─── How it works ─────────────────────────────────────────────────────────────
 *
 * Each call to `render()` disposes any previous Preact effect, then creates a
 * fresh `effect()` that:
 *  - On its first (synchronous) run: calls `super.render()` to collect all
 *    signal `.value` reads as subscriptions.
 *  - On subsequent runs (a dep changed): schedules a `forceUpdate()` via the
 *    shared microtask scheduler.
 *
 * This mirrors @lit-labs/signals behaviour adapted for Preact signals and
 * Stencil's component lifecycle.
 *
 * ─── Memory safety ────────────────────────────────────────────────────────────
 *
 * `this.__disposeRenderEffect` holds a strong reference to the Preact effect.
 * The effect closure captures `this` (the component). The Preact effect also
 * creates a subscription on any signal it read — so the signal holds a
 * subscriber reference too. Calling `dispose()` in `disconnectedCallback`
 * clears both the effect and its signal subscriptions, breaking the cycle.
 *
 * For detached subtrees (removed before `disconnectedCallback` fires), the
 * `queueMicrotask` guard in `disconnectedCallback` handles DOM-move safety.
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

import { effect as preactEffect } from "@preact/signals-core";
import { forceUpdate } from "@stencil/core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

import { scheduler } from "../signals/core";

// ─── Mixin ────────────────────────────────────────────────────────────────────

/** Public surface added by SignalWatcher to any component. */
export type SignalWatcherApi = {
	updateEffect(fn: () => void): () => void;
};

export function SignalWatcher<TBase extends MixedInCtor<ComponentInterface>>(
	Base: TBase,
): TBase & MixedInCtor<SignalWatcherApi> {
	class SignalWatcherMixin extends Base {
		/** Cleanup returned by the most recent render-tracking Preact effect. */
		private __disposeRenderEffect: (() => void) | null = null;
		/** Guard: suppress forceUpdate calls before the element is connected. */
		private __connected = false;

		override connectedCallback(): void {
			this.__connected = true;
			super.connectedCallback?.();
		}

		override disconnectedCallback(): void {
			this.__connected = false;
			// Use queueMicrotask so DOM moves (remove + re-append in the same task,
			// as `repeat()` does) don't prematurely dispose the tracking effect.
			queueMicrotask(() => {
				if (!this.__connected) {
					this.__disposeRenderEffect?.();
					this.__disposeRenderEffect = null;
				}
			});
			super.disconnectedCallback?.();
		}

		override render(): unknown {
			// Tear down the previous tracking effect so deps are re-collected fresh.
			this.__disposeRenderEffect?.();
			this.__disposeRenderEffect = null;

			let renderResult: unknown;
			let firstRun = true;

			// Arrow function captures `this` from the enclosing render() scope —
			// no `self` alias needed.
			// `preactEffect` fires synchronously on creation (first run).
			// firstRun guard lets us call super.render() for dep collection there,
			// and schedule forceUpdate on all subsequent fires (dep changed).
			this.__disposeRenderEffect = preactEffect(() => {
				if (firstRun) {
					firstRun = false;
					// Read all signals inside render — Preact tracks every .value access.
					renderResult = this.__callSuperRender();
				} else if (this.__connected) {
					// A dependency changed after the initial render — schedule re-render.
					scheduler.schedule(() => forceUpdate(this as unknown as object));
				}
			});

			return renderResult;
		}

		/** @internal — called inside the Preact effect to isolate `super.render()`. */
		private __callSuperRender(): unknown {
			return super.render?.();
		}

		/**
		 * Run `fn` immediately and re-run it whenever any Preact signal it reads
		 * changes. Mirrors @lit-labs/signals' `updateEffect()` adapted for Preact.
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
			// Preact's effect() auto-tracks and auto-reruns — no manual re-arming needed.
			return preactEffect(fn);
		}
	}

	return SignalWatcherMixin as unknown as TBase & MixedInCtor<SignalWatcherApi>;
}
