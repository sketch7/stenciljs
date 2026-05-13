# stencil-signals

> TC39 Signals integration for StencilJS — auto-reactive components without prop drilling or manual subscriptions.

[![npm version](https://img.shields.io/npm/v/@ssv/stencil-signals.svg)](https://www.npmjs.com/package/@ssv/stencil-signals)
[![license](https://img.shields.io/npm/l/@ssv/stencil-signals.svg)](LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/ssv/stencil-signals/ci.yml?label=tests)](https://github.com/ssv/stencil-signals/actions)

`stencil-signals` brings reactive signal-based state management to StencilJS components. Any signal accessed during `render()` is automatically tracked — when that signal changes, the component re-renders. No `@Watch`, no event buses, no manual subscription wiring.

The library is inspired by [`@lit-labs/signals`](https://github.com/lit/lit/tree/main/packages/labs/signals) and supports two backends: the [TC39 Signals Proposal](https://github.com/tc39/proposal-signals) (via `signal-polyfill`) and [Preact Signals](https://github.com/preactjs/signals). Both expose the same API; the backend is chosen explicitly by import path — there is no runtime auto-detection.

## Why stencil-signals?

StencilJS is already reactive — but `@State` and `@Prop` are **local and push-based**. Sharing state between unrelated components requires stores, events, or context APIs. TC39 Signals are **global and pull-based**: any component that reads a signal during render automatically subscribes to it.

**Traditional StencilJS:**

```tsx
// State is isolated per component; sharing requires prop drilling or a shared service
@Component({ tag: "my-counter" })
export class MyCounter {
  @State() count = 0;
  @State() doubled = 0;

  @Watch("count")
  syncDoubled(next: number) {
    this.doubled = next * 2;
  } // manual derived state

  render() {
    return (
      <button onClick={() => this.count++}>
        {this.count} (×2: {this.doubled})
      </button>
    );
  }
}
```

**With stencil-signals:**

```tsx
// Shared reactive state — any component reading these signals re-renders on change
export const count = signal(0);
export const doubled = computed(() => count() * 2);

@Component({ tag: "my-counter" })
export class MyCounter extends SignalWatcher(class {}) {
  render() {
    return (
      <button onClick={() => count.update(n => n + 1)}>
        {count()} (×2: {doubled()})
      </button>
    );
  }
}
```

| Feature                    | `@State()` | stencil-signals       |
| -------------------------- | ---------- | --------------------- |
| Triggers re-render         | ✅         | ✅                    |
| Shared across components   | ❌         | ✅                    |
| Computed/derived values    | ❌         | ✅ `computed()`       |
| Auto-tracking side effects | ❌         | ✅ `effect(fn)`       |
| Explicit-dep side effects  | ❌         | ✅ `effect(deps, fn)` |
| Async derived state        | ❌         | ✅ `computedAsync`    |
| Previous value tracking    | ❌         | ✅ `computedPrevious` |
| TC39 standard              | ❌         | ✅                    |

## Features

- **`SignalWatcher` mixin** — wraps `render()` to auto-track signal dependencies and re-render when they change
- **`SignalWatcherController`** — composition-pattern alternative to the mixin; extend your own `ReactiveControllerHost` and register the controller in the constructor
- **`@useSignal` decorator** — bind a signal directly to a class property for ergonomic reads and writes
- **`effect`** — side effects with auto-tracking or explicit dependencies, with cleanup support
- **`computedAsync`** — async derived signals with `pending`/`resolved`/`error` status and automatic `AbortSignal` cancellation
- **`computedPrevious`** — derived signal that holds the previous value of another signal
- **`createStore`** — wrap a plain object in per-property signals via a reactive Proxy
- **Dual-backend** — TC39 (`signal-polyfill`) or Preact Signals; same API, swap by changing the import path
- **Stencil `Mixin()` compatible** — composes with other Stencil controller mixins (v4.37+)

## Installation

Choose one signal backend and install it alongside the library:

```bash
# TC39 backend (recommended)
npm install @ssv/stencil-signals signal-polyfill

# Preact Signals backend
npm install @ssv/stencil-signals @preact/signals-core
```

**Peer requirements:** `@stencil/core >=4.43.0`

Then activate the adapter once at app startup — before any component mounts. In a StencilJS app the right place is a [global script](https://stenciljs.com/docs/config#globalscript):

```ts
// src/global.ts
import "@ssv/stencil-signals/tc39"; // or "/preact"
export default function globalScript() {}
```

```ts
// stencil.config.ts
export const config: Config = {
  globalScript: "src/global.ts",
  // ...
};
```

The side-effect import registers the adapter synchronously, so it is always ready before the first component render.

## Quick Start

```ts
// store.ts — define shared state once, outside any component
import { signal, computed } from '@ssv/stencil-signals';

export const count = signal(0);
export const doubled = computed(() => count() * 2);
import { Component } from '@stencil/core';
import { SignalWatcher, useSignal } from '@ssv/stencil-signals';
import { count, doubled } from './store';

@Component({ tag: 'my-counter', shadow: true })
export class MyCounter extends SignalWatcher(class {}) {
  @useSignal(count) count!: number;

  render() {
    return (
      <div>
        <p>Count: {this.count} — doubled: {doubled()}</p>
        <button onClick={() => this.count++}>+1</button>
      </div>
    );
  }
}
```

Any other component that reads `count` or `doubled` will also re-render when those signals change.

## Usage

### `SignalWatcher`

`SignalWatcher` is a mixin factory that patches `render()` to collect signal dependencies and schedule a re-render whenever those signals change.

**Direct extension** (no other mixins, or Stencil < 4.37):

```tsx
@Component({ tag: "my-comp", shadow: true })
export class MyComp extends SignalWatcher(class {}) {
  render() {
    return <p>{mySignal()}</p>;
  }
}
```

**`Mixin()` composition** (Stencil v4.37+, when combining with other mixins):

```tsx
import { Component, Mixin } from "@stencil/core";
import { SignalWatcher } from "@ssv/stencil-signals";
import { LoggingMixin } from "./mixins/logging-mixin";

@Component({ tag: "my-comp", shadow: true })
export class MyComp extends Mixin(SignalWatcher, LoggingMixin) {
  componentDidLoad() {
    super.componentDidLoad?.();
  }

  render() {
    return <p>{mySignal()}</p>;
  }
}
```

Put `SignalWatcher` first in `Mixin()` so it wraps the outermost `render()`.

**How re-rendering works:**

- `connectedCallback` — marks the component as active
- `render()` — wraps `super.render()` in a `Signal.Computed` to collect deps, then arms a `Signal.subtle.Watcher` on those deps; rebuilt fresh each render so conditional branches are always tracked correctly
- When any dep changes — `forceUpdate(this)` is queued via a shared microtask scheduler
- `disconnectedCallback` — disposes the watcher

### `SignalWatcherController`

An alternative to `SignalWatcher` for components that prefer **composition over inheritance**. Instead of mixing in behaviour, you extend your own `ReactiveControllerHost` base class and register the controller in the constructor.

Stencil does not ship `ReactiveControllerHost` or `ReactiveController` — you define them yourself. Copy the boilerplate below or adapt it to your project:

```ts
// reactive-controller.ts — consumer-owned boilerplate
import { forceUpdate } from "@stencil/core";

export interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
  hostWillLoad?(): Promise<void> | void;
  hostDidLoad?(): void;
  hostWillRender?(): Promise<void> | void;
  hostDidRender?(): void;
  hostWillUpdate?(): Promise<void> | void;
  hostDidUpdate?(): void;
}

export class ReactiveControllerHost {
  private __controllers = new Set<ReactiveController>();

  addController(c: ReactiveController) {
    this.__controllers.add(c);
  }
  removeController(c: ReactiveController) {
    this.__controllers.delete(c);
  }
  requestUpdate() {
    forceUpdate(this as any);
  }

  connectedCallback() {
    for (const c of this.__controllers) c.hostConnected?.();
  }
  disconnectedCallback() {
    for (const c of this.__controllers) c.hostDisconnected?.();
  }
  componentDidLoad() {
    for (const c of this.__controllers) c.hostDidLoad?.();
  }
  componentDidRender() {
    for (const c of this.__controllers) c.hostDidRender?.();
  }
  componentDidUpdate() {
    for (const c of this.__controllers) c.hostDidUpdate?.();
  }
  // componentWillLoad/Render/Update: collect promises and return Promise.all([...]).then(() => {})
}
```

Then register `SignalWatcherController` in your component:

```tsx
import { Component, h } from "@stencil/core";
import { SignalWatcherController, effect } from "@ssv/stencil-signals";
import { ReactiveControllerHost } from "./reactive-controller";
import { count, doubled } from "./store";

@Component({ tag: "my-counter", shadow: false })
export class MyCounter extends ReactiveControllerHost {
  constructor() {
    super();
    this.addController(new SignalWatcherController(this));
  }

  connectedCallback() {
    super.connectedCallback();
  }

  render() {
    return (
      <div>
        <p>
          {count()} (doubled: {doubled()})
        </p>
        <button onClick={() => count.update(n => n + 1)}>+1</button>
      </div>
    );
  }
}
```

**Owner scope and auto-disposal:** `SignalWatcherController.hostConnected()` activates a shared owner scope for one microtask. Any `effect`, `computedAsync`, or `computedPrevious` created during that window — including in your `connectedCallback` after `super.connectedCallback()` — registers its dispose function automatically. On unmount, `hostDisconnected()` flushes all registered cleanups in one pass.

Alternatively, pass `this` directly to any watcher utility (even from a class property initializer) — they register with the component's `__watcherRegistry` and are auto-disposed on `disconnectedCallback`, then reinited on `connectedCallback`.

**Comparison with the mixin:**

|                              | `Mixin(SignalWatcher)` | `SignalWatcherController`                       |
| ---------------------------- | ---------------------- | ----------------------------------------------- |
| Inheritance                  | Mixin chain            | Composition                                     |
| API collisions               | Possible               | None                                            |
| Extra boilerplate            | None                   | `ReactiveControllerHost` (one-time, copy/paste) |
| Works with other controllers | Via `Mixin()`          | Via `addController()`                           |
| Multiple controllers         | `Mixin(A, B, C)`       | `addController(a); addController(b)`            |

### `@useSignal`

Bind a signal to a class property. Reads call `sig()`; writes call `signal.set()`.

```tsx
const theme = signal<"light" | "dark">("light");

@Component({ tag: "my-comp" })
export class MyComp extends SignalWatcher(class {}) {
  @useSignal(theme) theme!: "light" | "dark";

  render() {
    return (
      <button
        onClick={() =>
          (this.theme = this.theme === "light" ? "dark" : "light")
        }>
        Toggle ({this.theme})
      </button>
    );
  }
}
```

> [!NOTE]
> Writing to a property bound to a `computed` signal throws at runtime. Use `@useSignal` only with writable signals.

### `effect`

**Auto-tracking** — any signal read inside the callback is tracked automatically:

```ts
const stop = effect(() => {
  document.title = `Count: ${count()}`;
});

stop(); // dispose manually
```

Inside a `SignalWatcher` component, pass `this` as the last argument — the effect is auto-disposed on `disconnectedCallback` and reinited on `connectedCallback`:

```tsx
@Component({ tag: "my-comp", shadow: false })
export class MyComp extends Mixin(SignalWatcher) {
  readonly titleWatch = effect(() => {
    document.title = `Count: ${count()}`;
  }, this);

  // _stop() can still be called manually to dispose early
}
```

If the callback returns a function, it is called as cleanup before the next re-run.

**Explicit dependencies** — list the signals you care about; values are passed as a typed tuple (no `()` call needed inside `fn`):

```ts
const stop = effect(
  [userId, theme],
  ([id, currentTheme], onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());

    fetch(`/api/users/${id}?theme=${currentTheme}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => userStore.set(data));
  },
  { defer: true }, // skip the initial run, fire only on first change
);
```

With `this` as host (options can be omitted when no options are needed):

```tsx
private readonly _stop = effect([userId, theme], ([id, t], onCleanup) => {
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  fetch(`/api/users/${id}?theme=${t}`, { signal: ctrl.signal })
    .then(r => r.json()).then(data => userStore.set(data));
}, this);
```

Signal reads _inside_ `fn` that are not in `deps` are untracked — giving you precise control over what triggers the effect.

|                            | Auto-tracking                         | Explicit deps               |
| -------------------------- | ------------------------------------- | --------------------------- |
| Dep declaration            | Implicit (any `sig()` call inside fn) | Explicit array              |
| Risk of unexpected re-runs | Higher                                | None                        |
| Values passed to fn        | No — call `sig()` manually            | Yes, typed tuple            |
| Best for                   | Simple reactive side-effects          | Precise control, async work |

### `computedAsync`

An async derived signal. `fn` receives an `AbortSignal` and returns `Promise<T>`. The result is a `Signal.Computed` holding a discriminated union with `status`, `value`, and optional `error`.

When a tracked signal changes, the previous in-flight request is automatically cancelled before the new one starts — no stale responses, no race conditions.

```tsx
const userId = signal(1);

@Component({ tag: "user-card", shadow: false })
export class UserCard extends Mixin(SignalWatcher) {
  // Pass `this` — auto-disposed on disconnect, reinited on reconnect.
  readonly user = computedAsync<User>(async abortSignal => {
    const res = await fetch(`/api/users/${userId()}`, { signal: abortSignal });
    if (!res.ok) throw new Error(res.statusText);
    return res.json() as Promise<User>;
  }, this);

  render() {
    const result = this.user();
    if (isPending(result)) return <p>Loading…</p>;
    if (isError(result)) return <p>Error: {String(result.error)}</p>;
    return <UserCard user={result.value} />;
  }
}
```

Without a component host (e.g. for module-level state) you can still use the options form:

```ts
const user = computedAsync(
  async abortSignal => {
    const res = await fetch(`/api/users/${userId()}`, { signal: abortSignal });
    return res.json() as Promise<User>;
  },
  { initialValue: null },
);

// call user.dispose() manually when done
```

`value` is always present so templates can show stale data while a reload is in progress.

**Options** (when not using the host form):

| Option         | Type                | Default     | Description                                  |
| -------------- | ------------------- | ----------- | -------------------------------------------- |
| `initialValue` | `T`                 | `undefined` | `result.value` before the first resolution   |
| `equal`        | `(a, b) => boolean` | `Object.is` | Skip update when resolved value is unchanged |

### `computedPrevious`

A derived signal that holds the value a signal had before its most recent change.

```ts
const page = signal(1);
const prevPage = computedPrevious(page); // undefined until first change

page.set(2);
prevPage(); // 1
page.set(3);
prevPage(); // 2
```

Inside a `SignalWatcher` component, pass `this` to get automatic dispose-on-disconnect / reinit-on-reconnect:

```tsx
@Component({ tag: "slide-view", shadow: false })
export class SlideView extends Mixin(SignalWatcher) {
  readonly prevPage = computedPrevious(page, this);

  render() {
    const direction = page() > (this.prevPage() ?? 0) ? "forward" : "back";
    return <div class={`slide slide--${direction}`}>{page()}</div>;
  }
}
```

Outside a component, pass an optional `initialValue` as the second argument:

```ts
const prevPage = computedPrevious(page, 0); // 0 instead of undefined
// call prevPage.dispose() manually when done
```

### `createStore`

Wrap a plain object in per-property signals exposed through a reactive Proxy. Read and write properties as if it were a plain object — every access and mutation goes through a signal automatically.

```ts
const store = createStore(
  { count: 0, theme: "light" as "light" | "dark", user: null as User | null },
  s => ({
    isLoggedIn: computed(() => s.user !== null),
    label: computed(() => `Count is ${s.count}`),
  }),
);

store.count++; // calls the underlying signal's set()
store.theme = "dark"; // same
store.isLoggedIn; // reads the computed signal
store.$signal("count"); // raw WritableSignal<number> for interop
store.$reset(); // reset all state keys to initial values
```

## Adapters

The adapter (signal backend) is selected by the import path. Activate it once at app startup via a side-effect import — there is no auto-detection.

| Import                        | Backend                  | Required peer dep             |
| ----------------------------- | ------------------------ | ----------------------------- |
| `@ssv/stencil-signals/tc39`   | TC39 (`signal-polyfill`) | `signal-polyfill ^0.2.0`      |
| `@ssv/stencil-signals/preact` | Preact Signals           | `@preact/signals-core ^1.0.0` |

The main entry `@ssv/stencil-signals` exports the full public API but **does not** activate any adapter. Import it for primitives (`signal`, `computed`, `effect`, etc.) in components and feature modules after the adapter is already registered.

> [!IMPORTANT]
> Pick one adapter per application. Mixing adapters in the same bundle is not supported.

## API Reference

### Primitives

| Export                    | Signature                                                        | Description                                                                       |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `signal(value, options?)` | `<T>(value: T, options?: SignalOptions<T>) => WritableSignal<T>` | Writable signal. Accepts an optional `equals` function to skip identical updates. |

`Signal<T>` — base read-only interface (also returned by `computed()`):

| Method       | Description                                                        |
| ------------ | ------------------------------------------------------------------ |
| `sig()`      | Read the current value (tracked).                                  |
| `sig.get()`  | Read the current value (tracked). Alias for calling as a function. |
| `sig.peek()` | Read the current value without tracking.                           |

`WritableSignal<T> extends Signal<T>` — adds write methods:

| Method                   | Description                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `sig.set(value)`         | Write a new value directly.                                                                                                                                                                                                      |
| `sig.update(fn)`         | Derive the next value from the current one — `fn` receives the current value via an untracked read and returns the new value. Prefer over `sig.set(sig() + 1)` to avoid accidental dependency tracking inside computeds/effects. |
| `sig.asReadonly()`       | Return a read-only `Signal<T>` view of this signal.                                                                                                                                                                              |
| `computed(fn, options?)` | `<T>(fn: () => T, options?: SignalOptions<T>) => Signal<T>`                                                                                                                                                                      | Read-only derived signal. Lazily recomputes when dependencies change. |
| `batch(fn)`              | `<T>(fn: () => T) => T`                                                                                                                                                                                                          | Batch multiple signal writes into one update cycle.                   |

### Component integration

| Export                    | Description                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SignalWatcher(Base)`     | Mixin factory. Wraps `render()` for automatic dependency tracking and re-rendering. Implements `WatcherRegistrar` so `this` can be passed to watcher utilities. |
| `SignalWatcherController` | Composition-pattern controller. Pass `this` in the constructor and register via `addController()` on a `ReactiveControllerHost`.                                |
| `WatcherRegistrar`        | Interface for the `host` argument accepted by watcher utilities. `SignalWatcher` components satisfy this automatically.                                         |
| `@useSignal(sig)`         | Property decorator. Proxies reads/writes to the given signal.                                                                                                   |

### Effects

| Export                              | Description                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effect(fn, host?)`                 | Auto-tracking effect. Re-runs whenever any signal accessed inside changes. Returns a dispose function.                                                            |
| `effect(deps, fn, options?, host?)` | Explicit-dep effect. `fn` receives signal values as a typed tuple. Supports `{ defer: true }` and `onCleanup`. Pass `host` to opt into auto lifecycle management. |

### Derived signals

| Export                                           | Description                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `computedAsync(fn, host)`                        | Async derived signal — auto lifecycle via component host. Returns `DisposableSignal<AsyncResult<T>>`. |
| `computedAsync(fn, options?)`                    | Async derived signal — manual or `connectedCallback`-scope lifecycle.                                 |
| `computedPrevious(source, host)`                 | Previous-value signal — auto lifecycle via component host.                                            |
| `computedPrevious(source, initialValue?, host?)` | Previous-value signal — manual or `connectedCallback`-scope lifecycle.                                |
| `isPending(result)`                              | Type guard — narrows `AsyncResult<T>` to `{ status: 'pending' }`.                                     |
| `isResolved(result)`                             | Type guard — narrows `AsyncResult<T>` to `{ status: 'resolved', value: T }`.                          |
| `isError(result)`                                | Type guard — narrows `AsyncResult<T>` to `{ status: 'error', error: unknown }`.                       |

### Store

| Export                                | Description                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `createStore(init, computedFactory?)` | Reactive Proxy over a plain object. Each property is backed by a signal. Includes `$signal(key)` and `$reset()` escape hatches. |

### Low-level

| Export                  | Description                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `createWatcher(notify)` | Low-level watcher. `notify` fires when any watched signal changes. Returns `{ watch(sig), unwatch(sig), dispose() }`. |
| `collectSignals(fn)`    | Run `fn` in a tracking context and return the `Set` of accessed signals. Useful for debugging.                        |

## Development

```bash
npm run build        # compile TypeScript → dist/
npm run test         # run unit tests with Vitest
npm run test:watch   # run tests in watch mode
npm run typecheck    # type-check without emitting
npm run lint         # lint with Oxlint
npm run format       # format with Oxfmt
npm run demo         # start the Vite demo app
```
