/**
 * @ssv/stencil-signals/extensions — sugar utilities
 *
 * Backend-agnostic extension utilities that work with any adapter (TC39 or Preact).
 * Import these from "@ssv/stencil-signals/extensions" alongside a core entry
 * point that activates the adapter first:
 *
 *   import { signal, SignalWatcher } from '@ssv/stencil-signals';
 *   import { computedAsync, createStore } from '@ssv/stencil-signals/extensions';
 *
 * Public API surface:
 *
 *  Derived / async signals
 *  ───────────────────────
 *  computedPrevious(sig)       Signal holding the previous value of another signal
 *  computedAsync(fn, opts)     Async derived signal with status tracking + AbortSignal
 *  isPending(result)           Type-guard: AsyncResult is pending
 *  isResolved(result)          Type-guard: AsyncResult is resolved
 *  isError(result)             Type-guard: AsyncResult is an error
 *
 *  Store helpers
 *  ─────────────
 *  createStore(init)           Wraps a plain object in signals; returns a reactive Proxy
 */

// ─── Derived signals ──────────────────────────────────────────────────────────
export { computedPrevious } from "./extensions/computed-previous";
export { computedAsync, isPending, isResolved, isError } from "./extensions/computed-async";
export type {
	DisposableSignal,
	AsyncResult,
	AsyncPending,
	AsyncResolved,
	AsyncError,
	AsyncStatus,
	ComputedAsyncOptions,
} from "./extensions/computed-async";

// ─── Store helpers ────────────────────────────────────────────────────────────
export { createStore } from "./extensions/create-store";
export type { Store } from "./extensions/create-store";

// ─── Prop / model bindings ────────────────────────────────────────────────────
export { withSignalProps } from "./extensions/signal-prop";
export type { SignalPropOptions, SignalPropsResult } from "./extensions/signal-prop";
