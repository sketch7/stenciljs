# effect

Side-effect utility with auto-tracking or explicit-dep semantics. Returns a `WatcherRef` (`{ dispose() }`).

**Import:** `@ssv/stencil-signals`

**Prerequisites (class fields):** `useSignalWatcher()` declared **before** this field ([signal-watcher.md](signal-watcher.md)).

**Example:** [timer](../../apps/stencil-playground/src/examples/stencil-signals/timer/) (`_durationEffect`, `_completionEffect`).

## Standalone vs class field

| Context                               | When it runs    | Disposal                            |
| ------------------------------------- | --------------- | ----------------------------------- |
| **Standalone** (module init, no host) | Immediately     | `.dispose()` or active owner if set |
| **Class field** on `SsvElement`       | `hostConnected` | Host disconnect + active owner      |

## Auto-tracking

Any signal read inside the callback is tracked automatically:

```ts
const ref = effect(onCleanup => {
  document.title = `Count: ${count()}`;
  onCleanup(() => {
    /* teardown */
  });
});

ref.dispose();
```

## Explicit dependencies

List the signals you care about; values are passed as a typed tuple:

```ts
const ref = effect(
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
  { defer: true },
);
```

`defer: true` skips the initial run; the effect fires on the first dependency change only.

## Stencil class-field usage

```tsx
@Component({ tag: "my-comp", shadow: false })
export class MyComp extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly _titleEff = effect(() => {
    document.title = `Count: ${count()}`;
  });

  private readonly _userEff = effect(
    [userId, theme],
    ([id, t], onCleanup) => {
      const ctrl = new AbortController();
      onCleanup(() => ctrl.abort());
      fetch(`/api/users/${id}?theme=${t}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(data => userStore.set(data));
    },
    { defer: true },
  );
}
```

## Mode comparison

|                    | Auto-tracking                   | Explicit deps                            |
| ------------------ | ------------------------------- | ---------------------------------------- |
| Dep declaration    | Implicit (`sig()` inside fn)    | Explicit array                           |
| Unexpected re-runs | Higher if reads are broad       | Lower                                    |
| Values in callback | Read signals manually           | Typed tuple argument                     |
| Best for           | Document title, simple DOM sync | Fetch on id change, timers tied to props |

## Teardown

Register with `onCleanup(fn)` and/or return a cleanup function. On each re-run and on `dispose()`, prior cleanups run first (host-bound effects use `flushBetweenRuns: false` between reactive re-runs; cleanups still run on dispose).

Signal reads inside `fn` that are **not** listed in `deps` (explicit mode) are untracked.
