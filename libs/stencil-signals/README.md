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

| Feature                    | `@State()` | stencil-signals             |
| -------------------------- | ---------- | --------------------------- |
| Triggers re-render         | ✅         | ✅                          |
| Shared across components   | ❌         | ✅                          |
| Computed/derived values    | ❌         | ✅ `computed()`             |
| Auto-tracking side effects | ❌         | ✅ `effect(fn)`             |
| Explicit-dep side effects  | ❌         | ✅ `effect(host, deps, fn)` |
| Async derived state        | ❌         | ✅ `computedAsync`          |
| Previous value tracking    | ❌         | ✅ `computedPrevious`       |
| TC39 standard              | ❌         | ✅                          |

## Features

- **`SignalWatcherMixin` mixin** — wraps `render()` to auto-track signal dependencies and re-render when they change
- **`SignalWatcherController`** — composition-pattern alternative to the mixin; extend `SsvElement` from `@ssv/stencil.core` and call `withSignalController(this)` as a class-property initializer
- **`@useSignal` decorator** — bind a signal directly to a class property for ergonomic reads and writes
- **`withSignalProps`** — bridge multiple `@Prop()` fields to signals with full type inference; one-way or two-way bindings; `transform` typed from the prop type automatically
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
import { SsvElementMixin } from "@ssv/stencil.core";
import { signal, computed } from '@ssv/stencil-signals';

export const count = signal(0);
export const doubled = computed(() => count() * 2);
import { Component } from '@stencil/core';
import { SignalWatcherMixin, useSignal } from '@ssv/stencil-signals';
import { count, doubled } from './store';

@Component({ tag: 'my-counter', shadow: true })
export class MyCounter extends Mixin(SignalWatcherMixin, SsvElementMixin) {
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
import { SignalWatcherMixin } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";
import { LoggingMixin } from "./mixins/logging-mixin";

@Component({ tag: "my-comp", shadow: true })
export class MyComp extends Mixin(
  SignalWatcherMixin,
  LoggingMixin,
  SsvElementMixin,
) {
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

`SignalWatcher` installs a `SignalWatcherController` (via `withSignalController`) in the constructor, which:

- Wraps `render()` once in a persistent `Signal.Computed` that tracks all signal reads as dependencies
- Arms a `Signal.subtle.Watcher` that calls `requestUpdate()` whenever any tracked signal changes
- Bumps a version signal before each render so prop/state-triggered renders also execute correctly
- Disposes the watcher on `disconnectedCallback`

### `SignalWatcherController`

An alternative to `SignalWatcherMixin` for components that prefer **composition over inheritance**. Extend `SsvElement` (from `@ssv/stencil.core`) and call `withSignalController(this)` in a class-property initializer:

```tsx
import { Component, h } from "@stencil/core";
import { withSignalController } from "@ssv/stencil-signals";
import { SsvElement } from "@ssv/stencil.core";
import { count, doubled } from "./store";

@Component({ tag: "my-counter", shadow: false })
export class MyCounter extends SsvElement {
  readonly signalWatcher = withSignalController(this);

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

**Owner scope and auto-disposal:** When the component connects, `SignalWatcherController` activates a shared owner scope for one microtask. Any `effect`, `computedAsync`, or `computedPrevious` created during that window — including in your `connectedCallback` after `super.connectedCallback()` — registers its dispose function automatically. On disconnect, all registered cleanups are flushed in one pass.

Pass `this` to any watcher utility from a class-property initializer and the utility registers its lifecycle via `addController`, auto-disposing on disconnect and reiniting on the next connect:

```tsx
readonly _titleEff = effect(this, () => {
  document.title = `Count: ${count()}`;
});
```

**Comparison with the mixin:**

|                              | `Mixin(SignalWatcherMixin, SsvElementMixin)` | `SsvElement` + `withSignalController` |
| ---------------------------- | -------------------------------------------- | ------------------------------------- |
| Inheritance                  | Mixin chain                                  | Single base class                     |
| API collisions               | Possible                                     | None                                  |
| Extra boilerplate            | None                                         | None (`SsvElement` already provided)  |
| Works with other controllers | Via `Mixin()`                                | Via `addController()`                 |
| Multiple controllers         | `Mixin(A, B, C)`                             | `addController(a); addController(b)`  |

### `@useSignal`

Bind a signal to a class property. Reads call `sig()`; writes call `signal.set()`.

```tsx
const theme = signal<"light" | "dark">("light");

@Component({ tag: "my-comp" })
export class MyComp extends Mixin(SignalWatcherMixin, SsvElementMixin) {
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

### `withSignalProps`

Bridge multiple `@Prop()` fields to signals in one call. Each signal stays in sync with its prop across every render — no `@Watch` needed.

Import from the `/extensions` sub-path:

```tsx
import { withSignalProps } from "@ssv/stencil-signals/extensions";
```

Use it as a class-property initializer, passing the class constructor as the second argument so TypeScript resolves the host type concretely — `transform`'s `v` parameter is then automatically typed from the `@Prop` field:

```tsx
@Component({ tag: "app-timer", shadow: true })
export class AppTimer extends SsvElement {
  @Prop() duration = 60;
  @Prop({ reflect: true }) isRunning = false;

  @Event() isRunningChange!: EventEmitter<boolean>;

  readonly signalWatcher = withSignalController(this);
  readonly $props = withSignalProps(
    this,
    AppTimer,
  )({
    duration: { transform: v => Math.max(0, v) }, // v: number — Signal<number>
    isRunning: { twoWay: true }, // WritableSignal<boolean>
  });

  render() {
    return (
      <div>
        <p>Remaining: {this.$props.duration()}s</p>
        <button onClick={() => this.$props.isRunning.set(true)}>Start</button>
      </div>
    );
  }
}
```

**One-way (read-only)** — omit `twoWay`; the result is a read-only `Signal<T>` that mirrors the prop:

```ts
readonly $props = withSignalProps(this, AppTimerCounter)({
  timeRemaining: {},   // Signal<number> — auto-syncs on every render
});

// Usage in render:
const mins = Math.floor(this.$props.timeRemaining() / 60);
```

**Two-way (writable + event)** — set `twoWay: true`; the result is a `WritableSignal<T>`. Every `.set()` / `.update()` also dispatches a `${propName}Change` `CustomEvent` so parent components and framework wrappers can reflect the new value back:

```ts
readonly $props = withSignalProps(this, AppTimer)({
  isRunning: { twoWay: true }, // WritableSignal<boolean>
});

// Inside a method — fires isRunningChange CustomEvent automatically:
this.$props.isRunning.set(true);
```

Pair each two-way prop with a Stencil `@Event()` declaration so output targets (React, Vue, Angular) generate the correct event binding:

```ts
@Prop({ reflect: true }) isRunning = false;
@Event() isRunningChange!: EventEmitter<boolean>;
```

> [!NOTE]
> Typos in the config key are caught at compile time. A key that does not exist on the component class is typed `never` — the TypeScript compiler will flag it immediately.

**Options per prop:**

| Option      | Type                 | Description                                                        |
| ----------- | -------------------- | ------------------------------------------------------------------ |
| `transform` | `(rawValue: T) => T` | Sanitise the incoming prop value before storing in the signal.     |
| `twoWay`    | `boolean`            | Emit `${propName}Change` on every signal write (two-way binding).  |
| `default`   | `T`                  | Fallback used when the prop value is `null` or `undefined`.        |
| `required`  | `boolean`            | Log a console error when the prop is `null` / `undefined` on load. |

### `effect`

**Auto-tracking** — any signal read inside the callback is tracked automatically:

```ts
const stop = effect(() => {
  document.title = `Count: ${count()}`;
});

stop(); // dispose manually
```

Inside a `SignalWatcher` component, pass `this` as the **first** argument — the effect is auto-disposed on `disconnectedCallback` and reinited on `connectedCallback`:

```tsx
@Component({ tag: "my-comp", shadow: false })
export class MyComp extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  readonly titleWatch = effect(this, () => {
    document.title = `Count: ${count()}`;
  });

  // titleWatch() can still be called manually to dispose early
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
private readonly _stop = effect(this, [userId, theme], ([id, t], onCleanup) => {
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  fetch(`/api/users/${id}?theme=${t}`, { signal: ctrl.signal })
    .then(r => r.json()).then(data => userStore.set(data));
});
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
export class UserCard extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  // Pass `this` — auto-disposed on disconnect, reinited on reconnect.
  readonly user = computedAsync<User>(this, async abortSignal => {
    const res = await fetch(`/api/users/${userId()}`, { signal: abortSignal });
    if (!res.ok) throw new Error(res.statusText);
    return res.json() as Promise<User>;
  });

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
export class SlideView extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  readonly prevPage = computedPrevious(this, page);

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

| Export                       | Description                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SignalWatcherMixin(Base)`   | Mixin factory. Wraps `render()` for automatic dependency tracking and re-rendering. Implements `ReactiveControllerHost` so `this` can be passed to watcher utilities. |
| `withSignalController(host)` | Installs a `SignalWatcherController` on a `ReactiveControllerHost` and returns it. Preferred as a class-property initializer.                                         |
| `SignalWatcherController`    | Low-level controller registered by `withSignalController` or `SignalWatcher`. Manages the render-tracking watcher lifecycle.                                          |
| `@useSignal(sig)`            | Property decorator. Proxies reads/writes to the given signal.                                                                                                         |

### Prop bindings (`@ssv/stencil-signals/extensions`)

| Export                                     | Description                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `withSignalProps(host, HostClass)(config)` | Curried builder. Creates one signal per `@Prop` entry in `config`. Non-`twoWay` → `Signal<T>`; `twoWay` → `WritableSignal<T>`. |
| `SignalPropOptions<T>`                     | Options type for each prop entry (`transform`, `twoWay`, `default`, `required`).                                               |
| `SignalPropsResult<H, C>`                  | Mapped return type — `Signal<T>` or `WritableSignal<T>` per key, inferred from options.                                        |

### Effects

| Export                             | Description                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `effect(fn)`                       | Auto-tracking effect. Re-runs whenever any signal accessed inside changes. Returns a dispose function.         |
| `effect(host, fn)`                 | Auto-tracking effect with lifecycle host. Auto-disposed on disconnect, reinited on reconnect.                  |
| `effect(deps, fn, options?)`       | Explicit-dep effect. `fn` receives signal values as a typed tuple. Supports `{ defer: true }` and `onCleanup`. |
| `effect(host, deps, fn, options?)` | Explicit-dep effect with lifecycle host. Pass `host` to opt into auto lifecycle management.                    |

### Derived signals

| Export                                    | Description                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `computedAsync(host, fn)`                 | Async derived signal — auto lifecycle via component host. Returns `DisposableSignal<AsyncResult<T>>`. |
| `computedAsync(fn, options?)`             | Async derived signal — manual or `connectedCallback`-scope lifecycle.                                 |
| `computedPrevious(host, source)`          | Previous-value signal — auto lifecycle via component host.                                            |
| `computedPrevious(source, initialValue?)` | Previous-value signal — manual or `connectedCallback`-scope lifecycle.                                |
| `isPending(result)`                       | Type guard — narrows `AsyncResult<T>` to `{ status: 'pending' }`.                                     |
| `isResolved(result)`                      | Type guard — narrows `AsyncResult<T>` to `{ status: 'resolved', value: T }`.                          |
| `isError(result)`                         | Type guard — narrows `AsyncResult<T>` to `{ status: 'error', error: unknown }`.                       |

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
