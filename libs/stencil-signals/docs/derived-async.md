# derivedAsync

Async derived signal whose value comes from a promise. Re-runs whenever any tracked signal inside `fn` changes; prior in-flight work is cancelled via `AbortSignal` (switch semantics).

**Standalone**: runs immediately; call `.dispose()` when there is no active owner.

**Class field**: starts eagerly at field init (before `hostConnected`). On the server (`Build.isServer`), `hostWillLoad` awaits the first settlement so SSR HTML can include resolved data. Disposal via `useSignalWatcher()`. Declare `useSignalWatcher()` **before** this field.

## Basic usage

```ts
const userId = signal(1);

const user = derivedAsync(
  async abortSignal => {
    const res = await fetch(`/api/users/${userId()}`, { signal: abortSignal });
    if (!res.ok) throw new Error(res.statusText);
    return res.json() as Promise<User>;
  },
  { initialValue: null },
);

user.dispose(); // stop when done (standalone only)
```

## Stencil class-field usage

Host binding is automatic when used as a class field:

```tsx
@Component({ tag: "user-card", shadow: false })
export class UserCard extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly user = derivedAsync<User>(async abortSignal => {
    const res = await fetch(`/api/users/${userId()}`, { signal: abortSignal });
    if (!res.ok) throw new Error(res.statusText);
    return res.json() as Promise<User>;
  });

  render() {
    let row: User | undefined;
    let err: unknown;
    try {
      row = this.user();
    } catch (e) {
      err = e;
    }
    if (err !== undefined) return <p>Error: {String(err)}</p>;
    if (row === undefined) return <p>Loading…</p>;
    return <UserSummary user={row} />;
  }
}
```

## Return value

Returns `DisposableSignal<T>` (read-only `Signal<T>` + `dispose()` + `whenSettled`):

- `undefined` until the first successful resolve when `initialValue` is omitted
- `initialValue` fills that gap; latest resolved value stays visible during refetch (stale-while-revalidate)
- `get()` / `()` rethrow on error; `peek()` returns `undefined` instead of throwing
- `whenSettled` — `Promise` that resolves after the first success or failure (used for SSR `hostWillLoad`)

## SSR (Stencil hydrate)

On the server, `derivedAsync` registers `hostWillLoad` that returns `whenSettled`, so Stencil waits for the first async result before the initial render. The async effect also starts at field init (`eager`), not only on `hostConnected`.

In the browser, `hostWillLoad` does not block — you still get loader-then-data unless you provide `initialValue`.

For no-JavaScript fallbacks, `initialValue` from Vike `+data` remains a good complement.

## Options

| Option         | Type                | Default     | Description                                           |
| -------------- | ------------------- | ----------- | ----------------------------------------------------- |
| `initialValue` | `T`                 | `undefined` | Value before first resolution / stable during refetch |
| `equal`        | `(a, b) => boolean` | `Object.is` | Skip update when resolved value is unchanged          |
