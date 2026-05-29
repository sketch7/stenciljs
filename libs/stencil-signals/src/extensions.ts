// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect } from "./extensions/effect";
export { effectOnceIf } from "./extensions/effect-once-if";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";

// ─── Notifier ─────────────────────────────────────────────────────────────────
export { createNotifier } from "./extensions/create-notifier";
export type { CreateNotifierOptions, Notifier } from "./extensions/create-notifier";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync } from "./extensions/derived-async";
export type { DisposableSignal, DerivedAsyncFn, DerivedAsyncOptions } from "./extensions/derived-async";

// ─── Prop / model bindings ────────────────────────────────────────────────────
export { useSignalProps } from "./extensions/signal-prop";
export type { SignalPropOptions, SignalPropsResult } from "./extensions/signal-prop";

// ─── DOM event listeners ──────────────────────────────────────────────────────
export { signalFromEvent } from "./extensions/signal-from-event";
export type { SignalFromEventOptions } from "./extensions/signal-from-event";
