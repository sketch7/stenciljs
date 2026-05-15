/**
 * @ssv/stencil-signals — entry point
 *
 * Automatically activates TC39 (signal-polyfill) if it is installed, otherwise
 * falls back to Preact (@preact/signals-core). Install exactly one as a peer
 * dependency; having both installed makes TC39 win.
 *
 * Public API surface:
 *
 *  Primitives
 *  ──────────
 *  signal(value)              Create a writable SignalState
 *  computed(fn)               Create a read-only SignalComputed
 *  batch(fn)                  Batch signal writes (no-op on TC39)
 *  untracked(fn)              Run fn without tracking signal reads inside it
 *
 *  Component integration
 *  ─────────────────────
 *  SignalWatcher(Base)         Class mixin — auto-rerenders on signal change
 *
 *  Side effects
 *  ────────────
 *  effect(fn)                      Standalone auto-tracking effect; returns a dispose function
 *  effect(deps, fn, opts)           Standalone explicit-deps effect; returns a dispose function
 *  useSignalEffect(fn)              Lifecycle auto-tracking effect; starts/stops with host lifecycle
 *  useSignalEffect(deps, fn, opts)  Lifecycle explicit-deps effect; starts/stops with host lifecycle
 *
 *  Derived / async signals
 *  ───────────────────────
 *  computedPrevious(sig, init?)        Previous-value signal (→ /extensions)
 *  derivedAsync(fn, opts?)            Async derived signal with status tracking (→ /extensions)
 *  useDerivedAsync(fn, opts?)         Async derived signal; lifecycle-bound (→ /extensions)
 *  createStore(init)                   Reactive Proxy over a plain object (→ /extensions)
 *
 * For these utilities, import from "@ssv/stencil-signals/extensions".
 */

// ─── Primitives ───────────────────────────────────────────────────────────────
export { signal, computed, batch, untracked, scheduler, createWatcher, collectSignals } from "./signals/core";

export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "./adapters/types";

// ─── Component integration ────────────────────────────────────────────────────
export { SignalWatcherMixin } from "./mixins/signal-watcher";
export { SignalWatcherController, useSignalWatcher } from "./controllers/signal-watcher-controller";

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect, useSignalEffect } from "./extensions/effect";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync, useDerivedAsync, isPending, isResolved, isError } from "./extensions/derived-async";
export type {
	DisposableSignal,
	AsyncResult,
	AsyncPending,
	AsyncResolved,
	AsyncError,
	AsyncStatus,
	DerivedAsyncOptions,
} from "./extensions/derived-async";

// ─── Store helpers ────────────────────────────────────────────────────────────
export { createStore } from "./extensions/create-store";
export type { Store } from "./extensions/create-store";
