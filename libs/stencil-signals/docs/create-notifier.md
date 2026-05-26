# createNotifier

Create an imperative signal notifier — call `notify()` to wake every reactive consumer that reads `listen`, or attach `deps` so that signal changes automatically increment the counter.

**Import:** `@ssv/stencil-signals/extensions`

**Use case:** Bridge imperative code (event handlers, async callbacks, external APIs) into the reactive graph, or coordinate between multiple reactive subsystems that need a shared trigger.

## Signature

```ts
function createNotifier(options?: CreateNotifierOptions): Notifier;

type CreateNotifierOptions = {
  /** Signals whose changes also increment the counter. */
  deps?: Signal<unknown>[];
  /**
   * When deps are provided, start the counter at 1 so the first dep read
   * immediately notifies downstream. Default: true.
   */
  depsEmitInitially?: boolean;
};

type Notifier = {
  /** Increment the counter, waking all reactive consumers of `listen`. */
  notify(): void;
  /** Read-only signal. Track this inside effects or computeds to react on each notify/dep change. */
  listen: Signal<number>;
};
```

## When to use

✓ **Bridging imperative triggers** — fire a notification from a button click, WebSocket message, or timer without exposing a writable signal to callers.
✓ **Coordinating subsystems** — let unrelated components share a single "refresh" or "reset" signal.
✓ **Dep-aware invalidation** — combine automatic dep tracking with manual imperative control.

✗ **Carrying data** — use a plain `signal<T>()` when the value itself matters, not just that something changed.
✗ **One-time triggers** — use `effectOnceIf()` ([effect-once-if.md](effect-once-if.md)) when you only need to fire once.

## Basic usage

```ts
import { effect } from "@ssv/stencil-signals";
import { createNotifier } from "@ssv/stencil-signals/extensions";

const refresh = createNotifier();

effect(() => {
  if (refresh.listen()) {
    // runs only when notify() is called, not on init (listen() === 0 initially)
    fetchLatestData();
  }
});

// Elsewhere — e.g. a button click handler:
button.addEventListener("click", () => refresh.notify());
```

If you want the effect to also run on init, remove the `if` guard:

```ts
effect(() => {
  refresh.listen(); // just track — effect re-runs on every notify()
  render();
});
```

## With `deps`

Attach signal dependencies so that dep changes also fire the notifier:

```ts
import { signal } from "@ssv/stencil-signals";
import { createNotifier } from "@ssv/stencil-signals/extensions";

const userId = signal<number | null>(null);
const roleFilter = signal<string>("admin");

const notifier = createNotifier({ deps: [userId, roleFilter] });

effect(() => {
  if (notifier.listen()) {
    // re-runs when userId or roleFilter changes AND when notify() is called
    reloadTable(userId(), roleFilter());
  }
});

// Also fire manually on a button click:
refreshButton.addEventListener("click", () => notifier.notify());
```

### `depsEmitInitially`

By default (`depsEmitInitially: true`) the counter starts at **1**, so the effect's `if (notifier.listen())` branch executes immediately on the first run:

```ts
const notifier = createNotifier({ deps: [userId] });
// notifier.listen() === 1 on creation — effect fires right away
```

Set `depsEmitInitially: false` to start at **0** and only notify on actual changes:

```ts
const notifier = createNotifier({ deps: [userId], depsEmitInitially: false });
// notifier.listen() === 0 on creation — effect's if-guard skips the first run
```

## Counter semantics

| State                                           | Value                       |
| ----------------------------------------------- | --------------------------- |
| No deps, just created                           | `0`                         |
| No deps, after one `notify()`                   | `1`                         |
| Deps + `depsEmitInitially: true`, just created  | `1`                         |
| Deps + `depsEmitInitially: false`, just created | `0`                         |
| After any `notify()` or dep change              | previous + 1                |
| Same dep value set again                        | unchanged (no notification) |

The counter uses unsigned 32-bit arithmetic (`>>> 0`) and wraps from `0xFFFFFFFF` back to `0` — in practice this is never reached.

## Execution model

| Step                   | Behavior                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **Create (no deps)**   | `counter = signal(0)`. No effect created.                                                    |
| **Create (with deps)** | `counter = signal(initialValue)`. Inner auto-tracking effect created, tracking all deps.     |
| **`notify()`**         | `counter` incremented. Downstream reactive consumers re-run on next microtask.               |
| **Dep change**         | Inner effect re-runs, increments `counter`. Downstream consumers re-run one microtask later. |
| **Same dep value**     | Signal equality check prevents re-run — counter unchanged.                                   |

## StencilJS component example

```ts
import { Component } from "@stencil/core";
import { SignalWatcherMixin, signal } from "@ssv/stencil-signals";
import { createNotifier, effect } from "@ssv/stencil-signals/extensions";

const pageSignal = signal(1);
const dataNotifier = createNotifier({ deps: [pageSignal] });

@Component({ tag: "my-table" })
export class MyTable extends SignalWatcherMixin(HTMLElement) {
  readonly _loadData = effect(() => {
    if (dataNotifier.listen()) {
      this.loadData(pageSignal());
    }
  });

  private loadData(page: number) {
    fetch(`/api/items?page=${page}`).then(/* ... */);
  }
}

// Anywhere else in the app:
document
  .querySelector("#refresh-btn")!
  .addEventListener("click", () => dataNotifier.notify());
```

## Relationship to `effect()`

| Feature               | `effect()`           | `createNotifier`       |
| --------------------- | -------------------- | ---------------------- |
| Reactive dep tracking | ✓                    | ✓ (via `deps`)         |
| Imperative trigger    | ✗                    | ✓ (`notify()`)         |
| Carries a value       | ✗                    | counter (number)       |
| Auto-dispose          | ✓ (via `WatcherRef`) | inner effect only      |
| One-time execution    | ✗                    | ✗ (use `effectOnceIf`) |
