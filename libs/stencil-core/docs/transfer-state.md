# Transfer State

Serializes server-computed values into the component's shadow DOM as a `<script type="application/json">` tag. The client reads and removes it before the first render — no duplicate network requests.

```ts
import { provideTransferState, useTransferState, makeTransferKey } from "@ssv/stencil-core/transfer-state";
```

## API

| Export                 | Kind | Purpose                                                                       |
| ---------------------- | ---- | ----------------------------------------------------------------------------- |
| `provideTransferState` | fn   | Registers the host as provider; returns a `TransferState`                     |
| `useTransferState`     | fn   | Consumes the nearest ancestor provider; returns `TransferState`               |
| `makeTransferKey<T>`   | fn   | Creates a typed key for `get` / `set` / `transfer`                            |
| `TransferState`        | type | Shared API: `get`, `set`, `setLazy`, `transfer`, `toScriptElement` (optional) |
| `TransferKey<T>`       | type | Branded string that carries the value type                                    |

## Keys

```ts
export const TIME_KEY  = makeTransferKey<string>("time");
export const COUNT_KEY = makeTransferKey<number>("count");
export const POSTS_KEY = makeTransferKey<Post[]>("posts");
```

## Provider

Call `provideTransferState(id)` as a class field. The `<script>` tag is automatically injected into the shadow root in `componentDidLoad` — no manual placement needed.

```tsx
@Component({ tag: "app", shadow: true })
export class AppMyPage extends SsvElement {
  readonly #ts = provideTransferState("app");

  render() {
    const time  = this.#ts.transfer(TIME_KEY,  () => new Date().toISOString());
    const posts = this.#ts.transfer(POSTS_KEY, () => fetchPostsSync());

    return (
      <div>
        <p>{time}</p>
        <ul>{posts?.map(p => <li>{p.title}</li>)}</ul>
      </div>
    );
  }
}
```

`transfer(key, getValue)` behaviour:

| Environment | Action                                         |
| ----------- | ---------------------------------------------- |
| Server      | Calls `getValue()`, stores + returns the value |
| Client      | Returns the value read from the script tag     |

`toScriptElement()` emits a `<script id="__ssv-state__{id}" type="application/json">` VNode on the server and returns `null` on the client. It is **optional** — use it only when you need explicit placement control within the shadow DOM (e.g. to put the script before other children).

## setLazy

`setLazy(key, factory)` registers a factory that is evaluated **in `componentDidLoad`** — after the owning component and all its descendants have fully rendered. Use it when the value is produced by children's `hostWillLoad` (e.g. a dehydrated query cache seeded by descendant prefetch components).

The factory is never called on the client.

```ts
// Dehydrate a QueryClient whose cache is populated by children's hostWillLoad —
// re-evaluated in componentDidLoad so all descendant prefetches are settled.
ts.setLazy(DEHYDRATED_STATE_KEY, () => dehydrate(queryClient));
```

If both `set()` and `setLazy()` target the same key, `setLazy` wins in the serialized output.

> **SSR ordering note:** Stencil SSR guarantees that a parent's `componentDidLoad` fires only after all descendants have resolved (`componentOnReady`). This means `setLazy` factories always capture state written by any descendant's `hostWillLoad` — no co-location with `provideTransferState` required.

## Consumer

Descendant components receive the same state via context — no prop drilling.

```tsx
@Component({ tag: "app-post-list", shadow: true })
export class AppPostList extends SsvElement {
  readonly #ts = useTransferState();

  render() {
    const posts = this.#ts.transfer(POSTS_KEY, () => []);
    return <ul>{posts?.map(p => <li>{p.title}</li>)}</ul>;
  }
}
```

`useTransferState()` falls back to a global no-op when no ancestor provider exists — `toScriptElement()` always returns `null` and `transfer` returns `undefined` on the client.

## How it works

```
Server render
  provideTransferState("id")
    └─ transfer(KEY, getValue)  →  calls getValue(), stores result
    └─ setLazy(KEY, factory)    →  registers factory (not called yet)
    └─ render()                 →  toScriptElement() optional; component renders
    └─ componentDidLoad         →  all descendants settled
         └─ finds or creates <script id="__ssv-state__id" type="application/json">
         └─ re-evaluates lazy factories, serializes all values into script.textContent
              emitted inside <template shadowrootmode="open">

Client hydration
  hostConnected
    └─ shadowRoot.querySelector("#__ssv-state__id")
    └─ fromJSON(script.textContent)   → populates internal Map
    └─ script.remove()                → cleaned up before first render
  transfer(KEY, getValue)             → returns stored value, getValue() never called
```

The script lives in the shadow DOM — compatible with `@stencil/ssr` `fullDocument: false` mode and Declarative Shadow DOM.

## Example

[apps/stencil-playground/src/examples/transfer-state/](../../../apps/stencil-playground/src/examples/transfer-state/)
