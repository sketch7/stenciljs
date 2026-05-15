/**
 * @ssv/stencil-signals — adapters/tc39.ts
 *
 * SignalAdapter implementation backed by the TC39 signals proposal
 * (signal-polyfill v0.2+).
 *
 * Signals are callable functions: `counter()` reads the value (tracked),
 * `counter.set(v)` writes, `counter.peek()` reads without tracking.
 *
 * Because TC39Signal.subtle.Watcher.watch() requires actual TC39 signal instances
 * (not arbitrary functions), a module-level WeakMap maps each wrapper function
 * back to its raw TC39Signal.State / TC39Signal.Computed so createWatcher can resolve
 * the raw signal when watch() / unwatch() is called.
 *
 * The Watcher fires synchronously when a watched signal changes. Because
 * `watcher.watch()` is forbidden inside the notify callback (it calls
 * producerAccessed which throws when inNotificationPhase === true),
 * re-arming is deferred to a queueMicrotask.
 */

import { Signal as TC39Signal } from "signal-polyfill";

import { scheduler } from "../signals/core";
import type { SignalAdapter, WritableSignal, Signal, SignalOptions, AdapterWatcher } from "./types";

// ─── WeakMap: wrapper fn → raw TC39 signal ────────────────────────────────────
//
// TC39Signal.subtle.Watcher.watch() requires actual TC39Signal.State / TC39Signal.Computed
// instances. We store the mapping here so createWatcher can resolve raw signals.

type RawTC39 = TC39Signal.State<unknown> | InstanceType<typeof TC39Signal.Computed<unknown>>;
const rawMap = new WeakMap<object, RawTC39>();

// ─── Adapter ─────────────────────────────────────────────────────────────────

export const tc39Adapter: SignalAdapter = {
	createState<T>(value: T, options?: SignalOptions<T>): WritableSignal<T> {
		const raw = new TC39Signal.State<T>(value, options);
		const fn = Object.assign(() => raw.get(), {
			set: (v: T) => raw.set(v),
			update: (updater: (current: T) => T) => raw.set(updater(TC39Signal.subtle.untrack(() => raw.get()))),
			peek: () => TC39Signal.subtle.untrack(() => raw.get()),
			asReadonly: (): Signal<T> =>
				Object.assign(() => raw.get(), {
					get: () => raw.get(),
					peek: () => TC39Signal.subtle.untrack(() => raw.get()),
				}) as unknown as Signal<T>,
		}) as unknown as WritableSignal<T>;
		rawMap.set(fn as unknown as object, raw);
		return fn;
	},

	createComputed<T>(fn: () => T, options?: SignalOptions<T>): Signal<T> {
		const raw = new TC39Signal.Computed<T>(fn, options);
		const wrapper = Object.assign(() => raw.get(), {
			get: () => raw.get(),
			peek: () => TC39Signal.subtle.untrack(() => raw.get()),
		}) as unknown as Signal<T>;
		rawMap.set(wrapper as unknown as object, raw);
		return wrapper;
	},

	createEffect(fn: (onCleanup: (cb: CleanupFn) => void) => CleanupFn | void): { dispose(): void } {
		const cleanupState: {
			pendingCleanup: CleanupFn | null;
			userCleanup: CleanupFn | undefined;
		} = { pendingCleanup: null, userCleanup: undefined };
		let disposed = false;

		function flushCleanups(): void {
			cleanupState.pendingCleanup?.();
			cleanupState.pendingCleanup = null;
			if (typeof cleanupState.userCleanup === "function") {
				cleanupState.userCleanup();
				cleanupState.userCleanup = undefined;
			}
		}

		function flushAllCleanups(): void {
			cleanupState.pendingCleanup?.();
			if (typeof cleanupState.userCleanup === "function") {
				cleanupState.userCleanup();
			}
		}

		function runTracked(): void {
			flushCleanups();
			let onCleanupFn: CleanupFn | null = null;
			cleanupState.userCleanup = fn(cb => {
				onCleanupFn = cb;
			}) as CleanupFn | undefined;
			if (onCleanupFn) {
				cleanupState.pendingCleanup = onCleanupFn;
			}
		}

		// Wrap fn in a Computed so every signal.get() inside fn is tracked.
		const tracker = new TC39Signal.Computed<null>(() => {
			runTracked();
			return null;
		});

		const watcher = new TC39Signal.subtle.Watcher(() => {
			if (disposed) {
				return;
			}
			scheduler.schedule(run);
		});

		function run() {
			if (disposed) {
				return;
			}
			watcher.unwatch(tracker);
			tracker.get();
			watcher.watch(tracker);
		}

		tracker.get();
		watcher.watch(tracker);

		return {
			dispose() {
				disposed = true;
				flushAllCleanups();
				try {
					watcher.unwatch(tracker);
				} catch {
					/* ok */
				}
			},
		};
	},

	untrack<T>(fn: () => T): T {
		return TC39Signal.subtle.untrack(fn);
	},

	batch<T>(fn: () => T): T {
		// TC39 has no explicit batch; updates coalesce via the microtask scheduler.
		return fn();
	},

	createWatcher(notify: () => void): AdapterWatcher {
		let disposed = false;

		const watcher = new TC39Signal.subtle.Watcher(() => {
			if (disposed) {
				return;
			}
			// NOTE: watcher.watch() is forbidden inside the notify callback (TC39
			// notification phase). Re-arm via queueMicrotask so the watcher keeps
			// firing on subsequent changes. Always unwatch before watch to avoid
			// growing liveConsumerNode arrays (memory leak prevention).
			notify();
			queueMicrotask(() => {
				if (disposed) {
					return;
				}
				const sources = TC39Signal.subtle.introspectSources(watcher);
				for (const s of sources) {
					try {
						watcher.unwatch(s);
					} catch {
						/* ok */
					}
				}
				for (const s of sources) {
					try {
						watcher.watch(s);
					} catch {
						/* ok */
					}
				}
			});
		});

		return {
			watch(sig) {
				const raw = rawMap.get(sig as unknown as object) ?? (sig as unknown as RawTC39);
				watcher.watch(raw);
			},
			unwatch(sig) {
				const raw = rawMap.get(sig as unknown as object) ?? (sig as unknown as RawTC39);
				try {
					watcher.unwatch(raw);
				} catch {
					/* ok */
				}
			},
			dispose() {
				disposed = true;
				for (const s of TC39Signal.subtle.introspectSources(watcher)) {
					try {
						watcher.unwatch(s);
					} catch {
						/* ok */
					}
				}
			},
		};
	},
};

type CleanupFn = () => void;
