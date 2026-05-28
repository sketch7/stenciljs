# Transfer State

Serializes server-computed values into the component's shadow DOM as a `<script type="application/json">` tag. The client reads and removes it before the first render — no duplicate network requests.

```ts
import { provideTransferState, useTransferState, makeTransferKey } from "@ssv/stencil-core/transfer-state";
```

## API

| Export                 | Kind | Purpose                                                            |
| ---------------------- | ---- | ------------------------------------------------------------------ |
| `provideTransferState` | fn   | Registers the host as provider; returns a `TransferState`          |
| `useTransferState`     | fn   | Consumes the nearest ancestor provider; returns `TransferState`    |
| `makeTransferKey<T>`   | fn   | Creates a typed key for `get` / `set` / `transfer`                 |
| `TransferState`        | type | Shared API: `get`, `set`, `setLazy`, `transfer`, `toScriptElement` |
| `TransferKey<T>`       | type | Branded string that carries the value type                         |

## Keys

```ts
export const TIME_KEY  = makeTransferKey<string>("time");
export const COUNT_KEY = makeTransferKey<number>("count");
export const POSTS_KEY = makeTransferKey<Post[]>("posts");
```

## Provider

Call `provideTransferState(id)` as a class field and include `toScriptElement()` in `render()`.

```tsx
@Component({ tag: "app", shadow: true })
export class AppMyPage extends SsvElement {
  readonly #ts = provideTransferState("app");

  render() {
    const time  = this.#ts.transfer(TIME_KEY,  () => new Date().toISOString());
    const posts = this.#ts.transfer(POSTS_KEY, () => fetchPostsSync());

    return (
      <div>
        {this.#ts.toScriptElement()}
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

`toScriptElement()` emits a `<script id="__ssv-state__{id}" type="application/json">` VNode on the server and returns `null` on the client. Place it anywhere inside the shadow root.

## setLazy

`setLazy(key, factory)` registers a factory that is called **at serialization time** — when `toScriptElement()` calls `toJSON()` during `render()`. Use it when the value is not yet ready at the time `setup()` runs but will be ready by the time `render()` executes.

The factory is never called on the client.

```ts
// Dehydrate a QueryClient whose cache is populated during hostWillLoad —
// called in render() so the data is fully settled before serialization.
ts.setLazy(DEHYDRATED_STATE_KEY, () => dehydrate(queryClient));
```

If both `set()` and `setLazy()` target the same key, `setLazy` wins in the serialized output.

> **SSR ordering note:** `setLazy` defers evaluation to `render()` of the **owning component**. Children's `hostWillLoad` still runs after the parent's `render()`, so child-populated state cannot be captured here. Prefetch in the same component that owns `provideTransferState`.

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
    └─ setLazy(KEY, factory)    →  registers factory; called during toScriptElement()
    └─ toScriptElement()        →  invokes lazy factories, then serializes all values
                                   <script id="__ssv-state__id">{json}</script>
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
