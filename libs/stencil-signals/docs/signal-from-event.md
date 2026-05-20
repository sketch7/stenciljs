# signalFromEvent

DOM event listener as a read-only signal — runtime equivalent of Stencil's `@Listen` for class fields and shared modules.

**Import:** `@ssv/stencil-signals/extensions` (also on `@ssv/stencil-signals/tc39` and `/preact` after adapter activation)

**Prerequisites (components):** `useSignalWatcher()` declared **before** this field ([signal-watcher.md](signal-watcher.md)).

**Example:** [mouse-event](../../apps/stencil-playground/src/examples/stencil-signals/mouse-event/), Vike [`+Page.tsx`](../../apps/vike-playground/src/pages/stencil-signals/mouse-event/+Page.tsx).

Listeners attach on `hostConnected`, detach on `hostDisconnected`, and re-attach on reconnect.

## Default: store the event

Without `map`, each firing stores the **event object**:

```tsx
@Component({ tag: "todo-host", shadow: true })
export class TodoHost extends SsvElement {
  readonly signalWatcher = useSignalWatcher();
  readonly $todoEvent = signalFromEvent<CustomEvent<Todo>>("todoCompleted");

  render() {
    const ev = this.$todoEvent();
    return ev ? <p>{ev.detail.title}</p> : null;
  }
}
```

Until the first event, the signal is `undefined`.

## Optional `map`

```tsx
readonly $todo = signalFromEvent("todoCompleted", {
  map: (e: CustomEvent<Todo>) => e.detail,
});
```

## Window scroll

```tsx
readonly $scrollY = signalFromEvent("scroll", {
  target: "window",
  map: () => window.scrollY,
});
```

`target`: `'window' | 'document' | 'body'` or host element (default).

## Options

| Option         | Description                                 |
| -------------- | ------------------------------------------- |
| `target`       | Event target (see above)                    |
| `capture`      | Capture phase (default `false`)             |
| `passive`      | Override Stencil passive heuristics         |
| `map`          | Store `map(event)` instead of the raw event |
| `initialValue` | Always-defined `Signal<T>` when set         |

### Passive listeners

When `passive` is omitted, the same event-name defaults as Stencil's `@Listen` compiler (`@stencil/core` 4.43.x) apply — e.g. `scroll`, `touchstart`, `wheel` default to `passive: true`.

### Shadow DOM and `@Event()` from children

Custom events from shadow children must **bubble** and be **`composed: true`**:

```ts
this.el.dispatchEvent(
  new CustomEvent("todoCompleted", { detail, bubbles: true, composed: true }),
);
```

## Parity with `@Listen`

| `@Listen`                | `signalFromEvent`                             |
| ------------------------ | --------------------------------------------- |
| Handler receives `Event` | Default stored value is the event             |
| Typed handler            | Generic `signalFromEvent<MyEvent>(...)`       |
| `ListenOptions`          | Same `target` / `capture` / `passive`         |
| Lifecycle                | `bindToHostDisposable` + active-owner cleanup |

`signalFromEvent` targets field initializers and modules; it does not replace compile-time `@Listen` on the class.
