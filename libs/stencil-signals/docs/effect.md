# effect

Side-effect utility with auto-tracking or explicit-dep semantics. Returns a `WatcherRef` (`{ dispose() }`).

**Standalone** (no Stencil host during init): runs immediately; disposal via `getActiveOwner()` when set, otherwise call `.dispose()` manually.

**Class field** (during `ReactiveControllerHost` construction): deferred until `hostConnected`; torn down with the host via `useSignalWatcher()`. Declare `useSignalWatcher()` **before** the effect field.

## Auto-tracking

Any signal read inside the callback is tracked automatically:

```ts
const ref = effect(onCleanup => {
  document.title = `Count: ${count()}`;
  onCleanup(() => {
    /* teardown */
  });
});

ref.dispose(); // stop manually
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
  { defer: true }, // skip the initial run, fire only on first change
);
```

## Stencil class-field usage

**Auto-tracking:**

```tsx
@Component({ tag: "my-comp", shadow: false })
export class MyComp extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly _titleEff = effect(_onCleanup => {
    document.title = `Count: ${count()}`;
  });
}
```

**Explicit dependencies:**

```tsx
private readonly _userEff = effect([userId, theme], ([id, t], onCleanup) => {
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  fetch(`/api/users/${id}?theme=${t}`, { signal: ctrl.signal })
    .then(r => r.json())
    .then(data => userStore.set(data));
}, { defer: true });
```

## Mode comparison

|                            | Auto-tracking                         | Explicit deps               |
| -------------------------- | ------------------------------------- | --------------------------- |
| Dep declaration            | Implicit (any `sig()` call inside fn) | Explicit array              |
| Risk of unexpected re-runs | Higher                                | None                        |
| Values passed to fn        | No — call `sig()` manually            | Yes, typed tuple            |
| Best for                   | Simple reactive side-effects          | Precise control, async work |

## Teardown

Register teardown with `onCleanup(fn)` and/or return a cleanup function. On each re-run and on `dispose()`, prior `onCleanup` runs first, then return cleanup.

Signal reads _inside_ `fn` that are not in `deps` are untracked.
