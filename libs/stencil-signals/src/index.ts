// ─── Primitives ───────────────────────────────────────────────────────────────
export { signal, computed, batch, untracked, scheduler, createWatcher, collectSignals } from "./signals/core";

export type { WritableSignal, Signal, SignalOptions, ComputedOptions, AdapterWatcher } from "./adapters/types";

// ─── Component integration ────────────────────────────────────────────────────
export { SignalWatcherMixin } from "./mixins/signal-watcher";
export { SignalWatcherController, useSignalWatcher } from "./controllers/signal-watcher-controller";

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect } from "./extensions/effect";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";
export { effectOnceIf } from "./extensions/effect-once-if";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync } from "./extensions/derived-async";
export type { DisposableSignal, DerivedAsyncFn, DerivedAsyncOptions } from "./extensions/derived-async";

// ─── Store helpers ────────────────────────────────────────────────────────────
export { createStore } from "./extensions/create-store";
export type { Store } from "./extensions/create-store";

// ─── Prop / model bindings ────────────────────────────────────────────────────
export { useSignalProps } from "./extensions/signal-prop";
export type { SignalPropOptions, SignalPropsResult } from "./extensions/signal-prop";

// ─── DOM event listeners ──────────────────────────────────────────────────────
export { signalFromEvent } from "./extensions/signal-from-event";
export type { SignalFromEventOptions } from "./extensions/signal-from-event";
