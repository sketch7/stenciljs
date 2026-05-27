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
  /** Stops the inner dep-tracking effect. No-op when no deps were provided. */
  dispose(): void;
};
```

## When to use

✓ **Bridging imperative triggers** — fire a notification from a button click, WebSocket message, or timer without exposing a writable signal to callers.
✓ **Coordinating subsystems** — let unrelated components share a single "refresh" or "reset" signal.
✓ **Dep-aware invalidation** — combine automatic dep tracking with manual imperative control.

✗ **Carrying data** — use a plain `signal<T>()` when the value itself matters, not just that something changed.
✗ **One-time triggers** — use `effectOnceIf()` ([effect-once-if.md](effect-once-if.md)) when you only need to fire once.

## Basic usage

The canonical pattern pairs `createNotifier` with `effect`'s explicit-deps overload and `{ defer: true }` — the effect only fires when `notify()` is called, never on init:

```ts
import { createNotifier, effect } from "@ssv/stencil-signals/extensions";

const $refresh = createNotifier();

effect(
  [$refresh.listen],
  () => {
    fetchLatestData();
  },
  { defer: true },
);

// Elsewhere — e.g. a button click handler:
button.addEventListener("click", () => $refresh.notify());
```

Prefix notifiers with `$` to make their imperative role visible at every call site (`$refresh.notify()`).

To also run on init, omit `defer` (defaults to `false`):

```ts
effect([$refresh.listen], () => {
  render();
});
// runs immediately on creation, then again on each notify()
```

## With `deps`

Attach signal dependencies so that dep changes also fire the notifier:

```ts
import { signal } from "@ssv/stencil-signals";
import { createNotifier, effect } from "@ssv/stencil-signals/extensions";

const userId = signal<number | null>(null);
const roleFilter = signal<string>("admin");

const $reload = createNotifier({ deps: [userId, roleFilter] });

effect(
  [$reload.listen],
  () => {
    // re-runs when userId or roleFilter changes AND when notify() is called
    reloadTable(userId(), roleFilter());
  },
  { defer: true },
);

// Also fire manually on a button click:
refreshButton.addEventListener("click", () => $reload.notify());
```

### `depsEmitInitially`

When using `{ defer: true }` the starting counter value is irrelevant — the effect skips its first run regardless. `depsEmitInitially` only matters when using auto-tracking effects without `defer`:

```ts
// auto-tracking with if-guard: depsEmitInitially: false keeps counter at 0 so the guard skips init
const notifier = createNotifier({ deps: [userId], depsEmitInitially: false });
effect(() => {
  if (notifier.listen()) {
    reloadTable(userId());
  }
});
```

Prefer the explicit-deps + `{ defer: true }` pattern above — it removes the if-guard entirely.

## Disposal

A no-deps notifier (`createNotifier()`) is just a counter signal — there is nothing to dispose.

A deps-based notifier owns an inner auto-tracking effect that watches those signals. Call `dispose()` to stop it:

```ts
const $reload = createNotifier({ deps: [userId] });

// later, when the notifier is no longer needed:
$reload.dispose();
// dep changes to userId no longer increment the counter
```

**Inside a component** the inner effect is automatically host-bound when the notifier is created during class-field initialisation (while a host context is active). It disposes on `disconnectedCallback` without any extra wiring:

```ts
const dep = signal(0);

@Component({ tag: "my-comp" })
export class MyComp extends SsvElement {
  readonly signalWatcher = useSignalWatcher();
  // inner effect is host-bound — disposes automatically on disconnect
  readonly $trigger = createNotifier({ deps: [dep] });
}
```

**Module-level with deps** — the notifier lives outside any host context, so the inner effect runs for the lifetime of the module. Call `dispose()` manually when you are done:

```ts
// module scope
const $poll = createNotifier({ deps: [sessionSignal] });

// e.g. on app teardown:
$poll.dispose();
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
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { createNotifier, effect } from "@ssv/stencil-signals/extensions";
import { Component, h } from "@stencil/core";

const inputText = signal("");
const $addTodo = createNotifier();

@Component({ tag: "app-todo" })
export class AppTodo extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly _addTodo = effect(
    [$addTodo.listen],
    () => {
      const text = inputText().trim();
      if (text) {
        todoStore.add(text);
        inputText.set("");
      }
    },
    { defer: true },
  );

  render() {
    return (
      <div>
        <input value={inputText()} onInput={e => inputText.set((e.target as HTMLInputElement).value)} />
        <button onClick={() => $addTodo.notify()}>Add</button>
      </div>
    );
  }
}
```

Key points:
- `$addTodo.listen` is the only dep — the effect fires only on `notify()`, not on every keystroke
- `{ defer: true }` skips the initial run so an empty input never triggers an add
- `inputText()` is read inside the effect body untracked — reads outside `deps` don't create subscriptions in explicit-deps mode

## Relationship to `effect()`

| Feature               | `effect()`           | `createNotifier`       |
| --------------------- | -------------------- | ---------------------- |
| Reactive dep tracking | ✓                    | ✓ (via `deps`)         |
| Imperative trigger    | ✗                    | ✓ (`notify()`)         |
| Carries a value       | ✗                    | counter (number)       |
| Auto-dispose          | ✓ (via `WatcherRef`) | ✓ (`dispose()`)        |
| One-time execution    | ✗                    | ✗ (use `effectOnceIf`) |
