/**
 * @ssv/stencil-signals/extensions — sugar utilities
 *
 * Backend-agnostic extension utilities that work with any adapter (TC39 or Preact).
 * Import these from "@ssv/stencil-signals/extensions" alongside a core entry
 * point that activates the adapter first:
 *
 *   import { signal, SignalWatcher } from '@ssv/stencil-signals';
 *   import { derivedAsync, createStore } from '@ssv/stencil-signals/extensions';
 *
 * Public API surface:
 *
 *  Derived / async signals
 *  ───────────────────────
 *  computedPrevious(sig, init?)        Previous-value signal
 *  derivedAsync(fn, opts)             Async derived signal (promise / sync T) + AbortSignal
 *  useDerivedAsync(fn, opts)          Lifecycle-bound async derived signal
 *
 *  Store helpers
 *  ─────────────
 *  createStore(init)           Wraps a plain object in signals; returns a reactive Proxy
 */

// ─── Side effects ─────────────────────────────────────────────────────────────
export { effect, useSignalEffect } from "./extensions/effect";
export type { CleanupFn, EffectOptions, WatcherRef, RegisterCleanup } from "./extensions/effect";

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { derivedAsync, useDerivedAsync } from "./extensions/derived-async";
export type { DisposableSignal, DerivedAsyncFn, DerivedAsyncOptions } from "./extensions/derived-async";

// ─── Store helpers ────────────────────────────────────────────────────────────
export { createStore } from "./extensions/create-store";
export type { Store } from "./extensions/create-store";

// ─── Prop / model bindings ────────────────────────────────────────────────────
export { useSignalProps } from "./extensions/signal-prop";
export type { SignalPropOptions, SignalPropsResult } from "./extensions/signal-prop";
