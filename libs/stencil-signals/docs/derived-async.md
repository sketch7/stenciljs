# derivedAsync

Async derived signal whose value comes from a promise. Re-runs whenever any tracked signal inside `fn` changes; prior in-flight work is cancelled via `AbortSignal` (switch semantics).

**Standalone**: runs immediately; call `.dispose()` when there is no active owner.

**Class field**: deferred until `hostConnected`; disposal via `useSignalWatcher()`. Declare `useSignalWatcher()` **before** this field.

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

Returns `DisposableSignal<T>` (read-only `Signal<T>` + `dispose()`):

- `undefined` until the first successful resolve when `initialValue` is omitted
- `initialValue` fills that gap; latest resolved value stays visible during refetch (stale-while-revalidate)
- `get()` / `()` rethrow on error; `peek()` returns `undefined` instead of throwing

## Options

| Option         | Type                | Default     | Description                                           |
| -------------- | ------------------- | ----------- | ----------------------------------------------------- |
| `initialValue` | `T`                 | `undefined` | Value before first resolution / stable during refetch |
| `equal`        | `(a, b) => boolean` | `Object.is` | Skip update when resolved value is unchanged          |
