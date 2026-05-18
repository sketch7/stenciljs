# signalFromEvent

DOM event listener as a read-only signal — runtime equivalent of Stencil's `@Listen` for class fields and shared modules.

Import from the `/extensions` sub-path (or from `@ssv/stencil-signals/tc39` / `preact` after the adapter is active):

```ts
import { signalFromEvent } from "@ssv/stencil-signals/extensions";
```

Declare `useSignalWatcher()` **before** this field on components. Listeners attach on `hostConnected`, detach on `hostDisconnected`, and re-attach on reconnect.

## Default: store the event (like `@Listen`)

Without `map`, each firing stores the **event object** (same as typing the `@Listen` handler parameter):

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

Project the event when `render()` only needs `detail` or another shape:

```tsx
readonly $todo = signalFromEvent("todoCompleted", {
  map: (e: CustomEvent<Todo>) => e.detail,
});
// Signal<Todo | undefined>
```

## Window scroll

```tsx
readonly $scrollY = signalFromEvent("scroll", {
  target: "window",
  map: () => window.scrollY,
});
```

`target` accepts `'window' | 'document' | 'body'`; default is the host element (`getElement(host)`).

## Options

| Option         | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `target`       | `'window'`, `'document'`, `'body'`, or host element (default)               |
| `capture`      | Capture phase (default `false`)                                             |
| `passive`      | Override Stencil's passive heuristics; see below                            |
| `map`          | Store `map(event)` instead of the event                                     |
| `initialValue` | When set, return type is `Signal<T>` (always defined). When omitted, `Signal<T \| undefined>` until the first event |

### Passive listeners

When `passive` is omitted, `signalFromEvent` uses the same event-name list as Stencil's `@Listen` compiler (`PASSIVE_TRUE_DEFAULTS` in `@stencil/core` 4.43.x) — e.g. `scroll`, `touchstart`, `wheel` default to `passive: true`.

### Shadow DOM and `@Event()` from children

Custom events from shadow children must **bubble** and be **`composed: true`** to reach a host-level listener (same as `@Listen` on the host):

```ts
this.el.dispatchEvent(
  new CustomEvent("todoCompleted", { detail, bubbles: true, composed: true }),
);
```

## Parity with `@Listen`

| `@Listen`                         | `signalFromEvent`                          |
| --------------------------------- | --------------------------------------- |
| Handler receives `Event`          | Default stored value is the event       |
| Optional typed handler parameter  | Generic `signalFromEvent<MyEvent>(...)`    |
| `ListenOptions` target/capture/passive | Same options on `signalFromEvent`     |
| Connect / disconnect lifecycle    | `bindToHostDisposable` + scope cleanup    |

`signalFromEvent` is for field initializers and modules; it does not replace the compile-time `@Listen` decorator on the class.
