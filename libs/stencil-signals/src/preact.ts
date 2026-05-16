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

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect } from "./extensions/effect";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync } from "./extensions/derived-async";
export type { DisposableSignal, DerivedAsyncFn, DerivedAsyncOptions } from "./extensions/derived-async";

export { signalFromEvent } from "./extensions/signal-from-event";
export type { SignalFromEventOptions } from "./extensions/signal-from-event";
