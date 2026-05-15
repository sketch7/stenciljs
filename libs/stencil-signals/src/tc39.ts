/**
 * @ssv/stencil-signals/tc39 — TC39 entry point
 *
 * Import from "@ssv/stencil-signals/tc39" to explicitly use the TC39
 * signals polyfill (signal-polyfill) as the backend. All primitives share the
 * same `.get()` / `.set()` / `.peek()` API regardless of backend.
 *
 * For automatic backend detection, import from "@ssv/stencil-signals".
 *
 * Public API surface:
 *
 *  Primitives
 *  ──────────
 *  signal(value)              Create a writable SignalState
 *  computed(fn)               Create a read-only SignalComputed
 *  batch(fn)                  No-op on TC39 (microtask scheduler coalesces)
 *  untracked(fn)              Run fn without tracking (`Signal.subtle.untrack`)
 *  Signal                     The raw TC39 Signal namespace (for advanced use)
 *
 *  Component integration
 *  ─────────────────────
 *  SignalWatcher(Base)         Class mixin — auto-rerenders on signal change
 *
 *  Side effects
 *  ────────────
 *  watchEffect(fn)                  Auto-tracking effect; re-runs on any accessed signal change
 *  watchEffect(host, fn)             Auto-tracking effect with lifecycle host
 *  watchEffect(deps, fn, opts)       Explicit-deps effect; re-runs only when listed signals change
 *  watchEffect(host, deps, fn, opts) Explicit-deps effect with lifecycle host
 *
 *  Derived / async signals
 *  ───────────────────────
 *  computedPrevious(sig)       Signal holding the previous value of another signal (→ /extensions)
 *  derivedAsync(fn, opts)     Async derived signal → Signal<T> (→ /extensions)
 *  createStore(init)           Reactive Proxy over a plain object (→ /extensions)
 *
 * For these utilities, import from "@ssv/stencil-signals/extensions".
 */

// ─── Activate TC39 adapter ────────────────────────────────────────────────────
// Must be the very first side-effect so all utilities see the adapter.
import { _setAdapter } from "./adapters/active";
import { tc39Adapter } from "./adapters/tc39";
_setAdapter(tc39Adapter);

// ─── TC39-specific raw namespace ─────────────────────────────────────────────
export { Signal as TC39Signal } from "signal-polyfill";

// ─── Primitives ───────────────────────────────────────────────────────────────
export { signal, computed, batch, untracked, scheduler, createWatcher, collectSignals } from "./signals/core";

export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "./adapters/types";

// ─── Component integration ────────────────────────────────────────────────────
export { SignalWatcherMixin } from "./mixins/signal-watcher";
export { SignalWatcherController } from "./controllers/signal-watcher-controller";

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect } from "./extensions/effect";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync } from "./extensions/derived-async";
export type { DisposableSignal, DerivedAsyncFn, DerivedAsyncOptions } from "./extensions/derived-async";
