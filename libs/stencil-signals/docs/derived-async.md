# derivedAsync

Async derived signal whose value comes from a promise. Re-runs when tracked signals inside `fn` change; prior in-flight work is cancelled via `AbortSignal` (switch semantics).

**Import:** `@ssv/stencil-signals` or `@ssv/stencil-signals/extensions`

**Prerequisites (class fields):** `useSignalWatcher()` declared **before** this field ([signal-watcher.md](signal-watcher.md)).

**Examples:** [derived-async](../../apps/stencil-playground/src/examples/stencil-signals/derived-async/), Vike [`+Page.tsx`](../../apps/vike-playground/src/pages/stencil-signals/derived-async/+Page.tsx).

## Standalone vs class field

| Context         | Behaviour                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| **Standalone**  | Runs immediately; call `.dispose()` when done                                  |
| **Class field** | Eager create at field init; `hostWillLoad` awaits `whenSettled` on server only |

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

user.dispose();
```

## Stencil class-field usage

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

`DisposableSignal<T>` — read-only signal plus `.dispose()` and `.whenSettled`:

- `undefined` until first resolve when `initialValue` is omitted
- `initialValue` covers loading and stale-while-revalidate during refetch
- `()` / `.get()` rethrow on error; `.peek()` returns `undefined` instead of throwing
- `whenSettled` — first success or failure (SSR `hostWillLoad` uses this)

## SSR (Stencil hydrate / Vike)

On the server (`Build.isServer`), `hostWillLoad` returns `whenSettled` so Stencil can include the first resolved value in SSR output. The async effect also starts at field init (`eager`), not only on `hostConnected`.

In the browser, `hostWillLoad` does not block — use loading UI or `initialValue` from route data.

For no-JS fallbacks, seed `initialValue` from server loaders (e.g. Vike `+data`) and optionally [`transfer-state`](../../stencil.core/docs/transfer-state.md).

## Options

| Option         | Type                | Default     | Description                                    |
| -------------- | ------------------- | ----------- | ---------------------------------------------- |
| `initialValue` | `T`                 | `undefined` | Value before first resolution / during refetch |
| `equal`        | `(a, b) => boolean` | `Object.is` | Skip update when resolved value unchanged      |
