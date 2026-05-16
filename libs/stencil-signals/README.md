# stencil-signals

> TC39 Signals integration for StencilJS — auto-reactive components without prop drilling or manual subscriptions.

[![npm version](https://img.shields.io/npm/v/@ssv/stencil-signals.svg)](https://www.npmjs.com/package/@ssv/stencil-signals)
[![license](https://img.shields.io/npm/l/@ssv/stencil-signals.svg)](LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/ssv/stencil-signals/ci.yml?label=tests)](https://github.com/ssv/stencil-signals/actions)

## Installation

Choose one signal backend:

```bash
# TC39 backend (recommended)
npm install @ssv/stencil-signals signal-polyfill

# Preact Signals backend
npm install @ssv/stencil-signals @preact/signals-core
```

**Peer requirements:** `@stencil/core >=4.43.0`

Activate the adapter once at app startup before any component mounts. In a StencilJS app use a [global script](https://stenciljs.com/docs/config#globalscript):

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

## Quick Start

```ts
// store.ts — define shared state once, outside any component
import { signal, computed } from "@ssv/stencil-signals";

export const count = signal(0);
export const doubled = computed(() => count() * 2);
```

```tsx
import { Component, Mixin } from "@stencil/core";
import { SignalWatcherMixin } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";
import { count, doubled } from "./store";

@Component({ tag: "my-counter", shadow: true })
export class MyCounter extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  render() {
    return (
      <div>
        <p>
          Count: {count()} — doubled: {doubled()}
        </p>
        <button onClick={() => count.update(n => n + 1)}>+1</button>
      </div>
    );
  }
}
```

Any component reading `count` or `doubled` re-renders when those signals change.

## Before / After

The scenarios below use the [`@stencil/store`](https://stenciljs.com/docs/stencil-store) examples in this repo as the baseline.

| Pain point                       | Traditional (`@stencil/store`)                            | With `stencil-signals`                                          |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Shared state → trigger re-render | `@State()` mirrors + `this.x = store.x` after every write | `useSignalWatcher()` — read store directly in `render()`        |
| Derived / computed values        | Inline recalculation every `render()` call                | `computed(() => ...)` — lazy, cached, defined once              |
| `@Prop` side effects + cleanup   | `@Watch` + `componentWillLoad` + `disconnectedCallback`   | `effect([this.$props.x], ...)` — auto-lifecycle, auto-cleanup   |
| Cross-component reactivity       | Prop drilling or store subscriptions per component        | Shared `signal()` / `computed()` — any component reads directly |

### Shared state — Counter

**Before** — every mutation requires a manual `@State` sync:

```tsx
export class AppCounter {
  @State() count = counterStore.count; // mirror field
  @State() additionalValue = counterStore.additionalValue;

  private increment() {
    counterStore.count++;
    this.count = counterStore.count; // ← manual sync required
  }

  render() {
    const doubled = this.additionalValue * 2; // ← recalculated every render
    const total = this.count + doubled;
    // ...
  }
}
```

**After** — `useSignalWatcher()` tracks reads in `render()` automatically:

```tsx
export class AppSignalsCounter extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly count = signal(0);
  readonly additionalValue = signal(0);
  readonly doubled = computed(() => this.additionalValue() * 2); // defined once, lazy
  readonly total = computed(() => this.count() + this.doubled());

  render() {
    // Read signals directly — no @State, no manual sync
    return (
      <span>
        {this.count()} + {this.additionalValue()} × 2 = {this.total()}
      </span>
    );
  }
}
```

### Mutation + derived state — Todo

**Before** — three places that manually sync `this.todos` back after mutations:

```tsx
export class AppTodo {
  @State() todos = todoStore.todos;   // mirror field

  private addTodo() {
    todoStore.todos = [...todoStore.todos, { ... }];
    this.todos = todoStore.todos;     // ← sync #1
  }
  private toggleTodo(id: number) {
    todoStore.todos = todoStore.todos.map(/* ... */);
    this.todos = todoStore.todos;     // ← sync #2
  }
  private deleteTodo(id: number) {
    todoStore.todos = todoStore.todos.filter(/* ... */);
    this.todos = todoStore.todos;     // ← sync #3
  }

  render() {
    const completed = this.todos.filter(t => t.completed).length; // ← inline every render
  }
}
```

**After** — mutations write once; `completedCount` is a cached `computed`:

```ts
// todo.store.ts
export const todoStore = createStore({ todos: [] as Todo[], nextId: 1 }, s => ({
  completedCount: computed(() => s.todos.filter(t => t.completed).length),
}));
```

```tsx
export class AppSignalsTodo extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  private addTodo()            { todoStore.todos = [...todoStore.todos, { ... }]; } // no sync
  private toggleTodo(id: number) { todoStore.todos = todoStore.todos.map(/* ... */); }
  private deleteTodo(id: number) { todoStore.todos = todoStore.todos.filter(/* ... */); }

  render() {
    return <p>{todoStore.completedCount} / {todoStore.todos.length} completed</p>;
  }
}
```

### Prop watching + side effects — Timer

**Before** — three separate lifecycle hooks to manage one derived behaviour:

```tsx
export class AppTimer {
  @Prop() duration = 60;
  @State() timeRemaining = 60;

  componentWillLoad() {
    this.timeRemaining = this.duration; // ← initialise
  }

  @Watch("duration")
  onDurationChange(next: number) {
    // ← react to prop change
    this.#stop();
    this.timeRemaining = Math.max(0, next);
  }

  disconnectedCallback() {
    this.#stop(); // ← manual cleanup
  }
}
```

**After** — one `effect` call handles init, change, and cleanup:

```tsx
export class AppTimer extends SsvElement {
  @Prop() duration = 60;
  @Prop({ reflect: true }) isRunning = false;

  readonly signalWatcher = useSignalWatcher();
  readonly $props = useSignalProps(AppTimer)({
    duration: { transform: v => Math.max(0, v) },
    isRunning: { twoWay: true },
  });

  readonly $timeRemaining = signal(60);

  readonly _durationEffect = effect(
    [this.$props.duration],
    ([d]) => {
      this.#stop();
      this.$timeRemaining.set(d);
    },
    { defer: true }, // ← init + change + auto-cleanup in one
  );
}
```

## Features

- **`SignalWatcherMixin`** / **`SignalWatcherController`** — auto-tracks signal reads during `render()`, re-renders on change — [docs](docs/signal-watcher.md)
- **`useSignalProps`** — bridge `@Prop()` fields to signals; one-way or two-way bindings with `transform` support — [docs](docs/signal-props.md)
- **`effect`** — auto-tracking or explicit-dep side effects; standalone or host-bound — [docs](docs/effect.md)
- **`derivedAsync`** — async derived signal with `AbortSignal` switch semantics — [docs](docs/derived-async.md)
- **`signalFromEvent`** — DOM events as signals (`@Listen` parity: event default, optional `map`) — [docs](docs/signal-from-event.md)
- **`computedPrevious`** — previous-value derived signal (single computed, no watcher)
- **`createStore`** — reactive Proxy over a plain object
- **`untracked`** — run without subscribing to reads inside; matches Angular / Preact `untracked()`
- **Dual-backend** — TC39 (`signal-polyfill`) or Preact Signals; same API, swap by import path
- **Stencil `Mixin()` compatible** — composes with other Stencil controller mixins (v4.37+)

## Usage

### `SignalWatcher` / `SignalWatcherController`

See [docs/signal-watcher.md](docs/signal-watcher.md).

### `useSignalProps`

See [docs/signal-props.md](docs/signal-props.md).

### `effect`

See [docs/effect.md](docs/effect.md).

### `untracked`

```ts
import { signal, computed, untracked } from "@ssv/stencil-signals/tc39";

const a = signal(0);
const b = signal(100);

// Only `a` is a dependency — changes to `b` do not invalidate the computed
const sum = computed(() => a() + untracked(() => b()));
```

Prefer `sig.peek()` for a single untracked read; use `untracked(() => { ... })` for several reads without subscribing.

### `derivedAsync`

See [docs/derived-async.md](docs/derived-async.md).

### `signalFromEvent`

See [docs/signal-from-event.md](docs/signal-from-event.md).

### `computedPrevious`

Derived signal holding the previous value of a source signal. No watcher or disposal needed.

```ts
const page = signal(1);
const prevPage = computedPrevious(page); // undefined until first change

page.set(2);
prevPage(); // 1
page.set(3);
prevPage(); // 2
```

Optional second argument sets the initial value (default: `undefined`):

```ts
const prevPage = computedPrevious(page, 0); // 0 before first change
```

### `createStore`

Reactive Proxy over a plain object — each property is backed by a signal.

```ts
const store = createStore(
  { count: 0, theme: "light" as "light" | "dark", user: null as User | null },
  s => ({
    isLoggedIn: computed(() => s.user !== null),
    label: computed(() => `Count is ${s.count}`),
  }),
);

store.count++; // signal.set()
store.theme = "dark";
store.isLoggedIn; // computed signal
store.$signal("count"); // raw WritableSignal<number>
store.$reset(); // reset all keys to initial values
```

## Adapters

The adapter is selected by import path. Activate it once at app startup via a side-effect import — there is no auto-detection.

| Import                        | Backend                  | Required peer dep             |
| ----------------------------- | ------------------------ | ----------------------------- |
| `@ssv/stencil-signals/tc39`   | TC39 (`signal-polyfill`) | `signal-polyfill ^0.2.0`      |
| `@ssv/stencil-signals/preact` | Preact Signals           | `@preact/signals-core ^1.0.0` |

The main entry `@ssv/stencil-signals` exports the full public API but **does not** activate any adapter. Import it for primitives in components and feature modules after the adapter is registered.

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

| Method             | Description                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sig.set(value)`   | Write a new value directly.                                                                                                                                                   |
| `sig.update(fn)`   | Derive the next value from the current one — `fn` receives the current value via an untracked read. Prefer over `sig.set(sig() + 1)` to avoid accidental dependency tracking. |
| `sig.asReadonly()` | Return a read-only `Signal<T>` view.                                                                                                                                          |

| Export                   | Signature                                                   | Description                                                           |
| ------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `computed(fn, options?)` | `<T>(fn: () => T, options?: SignalOptions<T>) => Signal<T>` | Read-only derived signal. Lazily recomputes when dependencies change. |
| `batch(fn)`              | `<T>(fn: () => T) => T`                                     | Batch multiple signal writes into one update cycle.                   |
| `untracked(fn)`          | `<T>(fn: () => T) => T`                                     | Run `fn` without tracking reads inside it.                            |

### Component integration

| Export                       | Description                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SignalWatcherMixin(Base)`   | Mixin factory. Wraps `render()` for automatic dependency tracking and re-rendering. Implements `ReactiveControllerHost` so `this` can be passed to watcher utilities. |
| `withSignalController(host)` | Installs a `SignalWatcherController` on a `ReactiveControllerHost` and returns it. Preferred as a class-property initializer.                                         |
| `SignalWatcherController`    | Low-level controller registered by `withSignalController` or `SignalWatcher`. Manages the render-tracking watcher lifecycle.                                          |

### Prop bindings (`@ssv/stencil-signals/extensions`)

| Export                              | Description                                                                                                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSignalProps(HostClass)(config)` | Curried builder. Creates one signal per `@Prop` entry in `config`. Requires `useSignalWatcher()` first; disposal via active-owner scope. Prop sync on `hostWillLoad` / `hostWillUpdate`. Non-`twoWay` → `Signal<T>`; `twoWay` → `WritableSignal<T>`. |
| `SignalPropOptions<T>`              | Options type for each prop entry (`transform`, `twoWay`, `default`, `required`).                                                                                                                                                                     |
| `SignalPropsResult<H, C>`           | Mapped return type — `Signal<T>` or `WritableSignal<T>` per key, inferred from options.                                                                                                                                                              |

### Effects

| Export                       | Description                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WatcherRef`                 | `{ dispose(): void }` — returned by `effect`; also implemented by `DisposableSignal`.                                                                                                    |
| `effect(fn)`                 | Auto-tracking effect. `fn(onCleanup)`; supports `onCleanup` + return cleanup. **Standalone**: runs immediately. **Class field**: starts on connect; requires `useSignalWatcher()` first. |
| `effect(deps, fn, options?)` | Explicit-dep effect. `fn(values, onCleanup)`; supports `{ defer: true }`. Same standalone vs class-field split as above.                                                                 |

### Derived signals

| Export                            | Description                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `derivedAsync(fn, options?)`      | Promise-backed derived signal. **Standalone** or **class field** (host-bound like `effect`). Returns `DisposableSignal<T>`. |
| `computedPrevious(source, init?)` | Previous-value derived signal. Returns `Signal<T \| undefined>`.                                                            |
| `DisposableSignal<T>`             | Read-only signal + `.dispose()` — returned by `derivedAsync`.                                                               |
| `DerivedAsyncFn<T>`               | `(abortSignal, previous?) => Promise<T> \| T`.                                                                              |
| `DerivedAsyncOptions<T>`          | `{ initialValue?, equal? }`.                                                                                                |

### DOM events (`@ssv/stencil-signals/extensions`)

| Export                 | Description                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `signalFromEvent(name, options?)` | Read-only signal updated on each DOM event. Default value is the event; optional `map` projects stored value. Requires `useSignalWatcher()` on components. |
| `SignalFromEventOptions<T>` | `ListenOptions` plus `map?` and `initialValue?`.                                                                 |

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
