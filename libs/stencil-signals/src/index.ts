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
 *
 *  Component integration
 *  ─────────────────────
 *  SignalWatcher(Base)         Class mixin — auto-rerenders on signal change
 *  @useSignal(sig)             Property decorator — binds signal ↔ class property
 *
 *  Side effects
 *  ────────────
 *  effect(fn)             Auto-tracking effect; re-runs on any accessed signal change
 *  effect(deps, fn, opts) Explicit-deps effect; re-runs only when listed signals change
 *
 *  Derived / async signals
 *  ───────────────────────
 *  computedPrevious(sig)       Signal holding the previous value of another signal (→ /extensions)
 *  computedAsync(fn, opts)     Async derived signal with status tracking (→ /extensions)
 *  createStore(init)           Reactive Proxy over a plain object (→ /extensions)
 *
 * For these utilities, import from "@ssv/stencil-signals/extensions".
 */

// ─── Activate TC39 adapter ────────────────────────────────────────────────────
import { _setAdapter } from "./adapters/active";
import { tc39Adapter } from "./adapters/tc39";

_setAdapter(tc39Adapter);

// ─── Primitives ───────────────────────────────────────────────────────────────
export { signal, computed, batch, scheduler, createWatcher, collectSignals } from "./signals/core";

export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "./adapters/types";

// ─── Component integration ────────────────────────────────────────────────────
export { SignalWatcher } from "./mixins/signal-watcher";
export type { SignalWatcherApi, WatcherRegistrar, WatcherEntry } from "./mixins/signal-watcher";
export { SignalWatcherController } from "./controllers/signal-watcher-controller";
export type { SignalWatcherControllerHost } from "./controllers/signal-watcher-controller";

// ─── Decorators ───────────────────────────────────────────────────────────────
export { useSignal } from "./directives/use-signal";

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect } from "./utils/effect";
export type { CleanupFn, EffectOptions } from "./utils/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./utils/computed-previous";
export { computedAsync, isPending, isResolved, isError } from "./utils/computed-async";
export type {
	DisposableSignal,
	AsyncResult,
	AsyncPending,
	AsyncResolved,
	AsyncError,
	AsyncStatus,
	ComputedAsyncOptions,
} from "./utils/computed-async";

// ─── Store helpers ────────────────────────────────────────────────────────────
export { createStore } from "./utils/create-store";
export type { Store } from "./utils/create-store";
