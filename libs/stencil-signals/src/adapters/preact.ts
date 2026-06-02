/**
 * @ssv/stencil-signals — adapters/preact.ts
 *
 * SignalAdapter implementation backed by @preact/signals-core v1.x.
 *
 * Signals are callable functions: `counter()` reads the value (tracked),
 * `counter.set(v)` writes, `counter.peek()` reads without tracking.
 *
 * Preact signals use `.value` (getter/setter) and `.peek()`. We wrap each
 * signal/computed in a callable function that exposes `.set()` / `.peek()`
 * to match the adapter interface. A module-level WeakMap maps each wrapper
 * function back to its raw Preact signal so the watcher can subscribe via
 * Preact's own effect(). Functions are objects, so they are valid WeakMap keys.
 *
 * The Watcher is emulated with a combined Preact computed (that reads all
 * watched signals) plus a Preact effect (that fires when the computed changes).
 * Preact effects are persistent — they re-subscribe automatically after each
 * fire, so no explicit re-arm is needed.
 */

import {
	signal as preactSignal,
	computed as preactComputed,
	effect as preactEffect,
	batch as preactBatch,
	untracked as preactUntracked,
} from "@preact/signals-core";
import type { ReadonlySignal } from "@preact/signals-core";

import type {
	AdapterEffectOptions,
	SignalAdapter,
	WritableSignal,
	Signal,
	SignalOptions,
	AdapterWatcher,
} from "./types";

// ─── WeakMap: wrapper fn → raw Preact signal ─────────────────────────────────
//
// Keyed by the wrapper function so the watcher can retrieve the raw signal when
// watch() / unwatch() is called with a wrapper. Functions are objects so they
// are valid WeakMap keys.

type RawPreact<T> = ReturnType<typeof preactSignal<T>> | ReadonlySignal<T>;
const rawMap = new WeakMap<object, RawPreact<unknown>>();

// ─── Adapter ─────────────────────────────────────────────────────────────────

export const preactAdapter: SignalAdapter = {
	createState<T>(value: T, options?: SignalOptions<T>): WritableSignal<T> {
		const raw = preactSignal<T>(value);
		const eq = options?.equals;

		const wrapped = Object.assign(() => raw.value, {
			set: (newVal: T) => {
				// Apply custom equals if provided — Preact doesn't have native equals support.
				if (eq?.(raw.peek(), newVal)) {
					return;
				}
				raw.value = newVal;
			},
			update: (updater: (current: T) => T) => {
				const next = updater(raw.peek());
				if (eq?.(raw.peek(), next)) {
					return;
				}
				raw.value = next;
			},
			peek: () => raw.peek(),
			asReadonly: (): Signal<T> =>
				Object.assign(() => raw.value, {
					get: () => raw.value,
					peek: () => raw.peek(),
				}) as unknown as Signal<T>,
		}) as unknown as WritableSignal<T>;
		rawMap.set(wrapped as unknown as object, raw as RawPreact<unknown>);
		return wrapped;
	},

	createComputed<T>(fn: () => T, _options?: SignalOptions<T>): Signal<T> {
		// Preact computed ignores equals option (always re-evaluates on dep change).
		const raw = preactComputed<T>(() => fn());

		const wrapped = Object.assign(() => raw.value, {
			get: () => raw.value,
			peek: () => raw.peek(),
		}) as unknown as Signal<T>;
		rawMap.set(wrapped as unknown as object, raw as RawPreact<unknown>);
		return wrapped;
	},

	createEffect(
		fn: (onCleanup: (cb: () => void) => void) => (() => void) | void,
		options?: AdapterEffectOptions,
	): { dispose(): void } {
		const flushBetweenRuns = options?.flushBetweenRuns !== false;

		if (flushBetweenRuns) {
			let stop: (() => void) | undefined;
			stop = preactEffect(() => {
				let onCleanupFn: (() => void) | null = null;
				const ret = fn(cb => {
					onCleanupFn = cb;
				});
				return () => {
					onCleanupFn?.();
					if (typeof ret === "function") {
						ret();
					}
				};
			});
			let disposed = false;
			return {
				dispose() {
					if (disposed) {
						return;
					}
					disposed = true;
					stop?.();
					stop = undefined;
				},
			};
		}

		const cleanupState: {
			pendingCleanup: (() => void) | null;
			userCleanup: (() => void) | undefined;
		} = { pendingCleanup: null, userCleanup: undefined };
		let stop: (() => void) | undefined;
		stop = preactEffect(() => {
			let onCleanupFn: (() => void) | null = null;
			const ret = fn(cb => {
				onCleanupFn = cb;
			});
			cleanupState.pendingCleanup = onCleanupFn;
			cleanupState.userCleanup = typeof ret === "function" ? ret : undefined;
			// Preact runs this before the next effect body — keep empty so user cleanups only run on dispose.
			return () => {
				/* no-op */
			};
		});
		let disposed = false;
		return {
			dispose() {
				if (disposed) {
					return;
				}
				disposed = true;
				stop?.();
				stop = undefined;
				cleanupState.pendingCleanup?.();
				cleanupState.pendingCleanup = null;
				if (typeof cleanupState.userCleanup === "function") {
					cleanupState.userCleanup();
					cleanupState.userCleanup = undefined;
				}
			},
		};
	},

	untrack<T>(fn: () => T): T {
		return preactUntracked(fn);
	},

	batch<T>(fn: () => T): T {
		return preactBatch(fn);
	},

	createWatcher(notify: () => void): AdapterWatcher {
		const rawWatched = new Set<RawPreact<unknown>>();
		let stopEffect: (() => void) | null = null;

		function rearm(): void {
			stopEffect?.();
			stopEffect = null;

			if (rawWatched.size === 0) {
				return;
			}

			// Snapshot current watched set — captures deps for this arm cycle.
			const snapshot = [...rawWatched];
			let firstRun = true;

			stopEffect = preactEffect(() => {
				// Reading each raw signal's .value subscribes this effect to it.
				// `void` discards the value explicitly — the side-effect is the point.
				for (const raw of snapshot) {
					// oxlint-disable-next-line no-void
					void (raw as ReadonlySignal<unknown>).value;
				}

				if (firstRun) {
					// Suppress initial synchronous fire — we only want to notify on change.
					firstRun = false;
				} else {
					notify();
				}
			});
		}

		return {
			watch(sig) {
				const raw = rawMap.get(sig as object);
				if (!raw) {
					throw new TypeError(
						"@ssv/stencil-signals: watch() received a signal not created " +
							"by the Preact adapter. Do not mix backends.",
					);
				}
				if (rawWatched.has(raw)) {
					// already watching — no rearm needed
					return;
				}
				rawWatched.add(raw);
				rearm();
			},

			unwatch(sig) {
				const raw = rawMap.get(sig as object);
				if (!raw || !rawWatched.has(raw)) {
					return;
				}
				rawWatched.delete(raw);
				rearm();
			},

			dispose() {
				stopEffect?.();
				stopEffect = null;
				rawWatched.clear();
			},
		};
	},
};
