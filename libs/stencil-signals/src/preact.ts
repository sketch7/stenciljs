/**
 * @ssv/stencil-signals/preact — Preact entry point
 *
 * Import from "@ssv/stencil-signals/preact" to use @preact/signals-core
 * as the backend. All primitives share the same `.get()` / `.set()` / `.peek()`
 * API as the TC39 entry point — only the import path changes.
 *
 * Public API surface:
 *
 *  Primitives
 *  ──────────
 *  signal(value)              Create a writable SignalState
 *  computed(fn)               Create a read-only SignalComputed
 *  batch(fn)                  Batch multiple signal writes (native Preact feature)
 *  untracked(fn)              Run fn without tracking (Preact `untracked`)
 *
 *  Component integration
 *  ─────────────────────
 *  SignalWatcher(Base)         Class mixin — auto-rerenders on signal change
 *  @useSignal(sig)             Property decorator — binds signal ↔ class property
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
 *  computedAsync(fn, opts)     Async derived signal with status tracking (→ /extensions)
 *  createStore(init)           Reactive Proxy over a plain object (→ /extensions)
 *
 * For these utilities, import from "@ssv/stencil-signals/extensions".
 */

// ─── Activate Preact adapter ─────────────────────────────────────────────────
// Must be the very first side-effect so all utilities see the adapter.
import { _setAdapter } from "./adapters/active";
import { preactAdapter } from "./adapters/preact";
_setAdapter(preactAdapter);

// ─── Primitives ───────────────────────────────────────────────────────────────
export { signal, computed, batch, untracked, scheduler, createWatcher, collectSignals } from "./signals/core";

export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "./adapters/types";

// ─── Component integration ────────────────────────────────────────────────────
export { SignalWatcherMixin } from "./mixins/signal-watcher";
export { SignalWatcherController } from "./controllers/signal-watcher-controller";

// ─── Decorators ───────────────────────────────────────────────────────────────
export { useSignal } from "./directives/use-signal";

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect, useSignalEffect } from "./extensions/effect";
export type { CleanupFn, EffectOptions } from "./extensions/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious, useComputedPrevious } from "./extensions/computed-previous";
export { computedAsync, useComputedAsync, isPending, isResolved, isError } from "./extensions/computed-async";
