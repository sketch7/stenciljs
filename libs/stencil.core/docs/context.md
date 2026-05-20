# Context

Tree-scoped dependency injection via DOM events. A consumer dispatches a `__ssv:context-request` event that bubbles up the DOM; the nearest ancestor `provideContext()` intercepts and responds. No provider → singleton fallback from `createContext`'s `defaultFactory`. SSR→client hydration (bottom-up init) is handled transparently.

## API

| Export           | Kind | Purpose                                                               |
| ---------------- | ---- | --------------------------------------------------------------------- |
| `createContext`  | fn   | Creates a typed `ContextKey` token with an optional default           |
| `provideContext` | fn   | Registers the host as a provider; returns the context value           |
| `useContext`     | fn   | Consumes the nearest ancestor provider; returns a `ContextRef`        |
| `ContextKey<T>`  | type | Opaque token that pairs a provider with its consumers                 |
| `ContextRef<T>`  | type | Stable ref: `.current` holds the resolved value before the first render |

## Resolution

```mermaid
flowchart TD
    A["hostConnected — dispatch __ssv:context-request<br/>bubbles + composed"] --> C{"nearest ancestor<br/>provideContext?"}
    C -- yes --> D["ref.current =<br/>provider value"]
    C -- no --> WL["hostWillLoad — retry dispatch"]
    WL --> C2{"nearest ancestor<br/>provideContext?"}
    C2 -- yes --> D
    C2 -- no --> E{"defaultFactory<br/>in createContext?"}
    E -- yes --> F["ref.current =<br/>singleton"]
    E -- no --> G["throws [ssv:context]"]

    style A fill:#d4e9ff,stroke:#7aaddd,color:#1a1a1a
    style WL fill:#d4e9ff,stroke:#7aaddd,color:#1a1a1a
    style C fill:#ffefd4,stroke:#ddaa66,color:#1a1a1a
    style C2 fill:#ffefd4,stroke:#ddaa66,color:#1a1a1a
    style D fill:#d4f0d4,stroke:#7acc7a,color:#1a1a1a
    style E fill:#ffefd4,stroke:#ddaa66,color:#1a1a1a
    style F fill:#d4f0d4,stroke:#7acc7a,color:#1a1a1a
    style G fill:#ffd4d4,stroke:#dd7a7a,color:#1a1a1a
```

`hostWillLoad` is a safety net for SSR bottom-up hydration — when the provider connects after the consumer, the retry finds it. Missing-provider errors surface as a rejected `componentWillLoad` (not a crash in `connectedCallback`).

## Define a context

```ts
// counter.context.ts
import { createContext } from "@ssv/stencil.core";

export const CounterContext = createContext<CounterStore>(
  () => createCounterStore(),
  { name: "counter" },
);
```

`defaultFactory` is called at most once — result cached as a singleton for consumers without a provider.

## Provide

```ts
@Component({ tag: "app-ctx-counter-group", shadow: true })
export class AppCtxCounterGroup extends SsvElement {
  readonly store = provideContext(CounterContext);

  render() {
    return <slot />;
  }
}
```

Each component calling `provideContext` gets a **fresh instance** (via `key.createInstance()`). Pass an explicit value or factory to override:

```ts
readonly store = provideContext(CounterContext, createCounterStore(10));
readonly store = provideContext(CounterContext, () => createCounterStore(10));
```

## Consume

```ts
@Component({ tag: "app-ctx-counter", shadow: true })
export class AppCtxCounter extends SsvElement {
  readonly #storeRef = useContext(CounterContext);

  render() {
    const { count } = this.#storeRef.current.state;
    return <span>{count}</span>;
  }
}
```

`.current` is always set by the time `render()` runs — resolution spans `hostConnected` through `hostWillLoad`, both before the first render.

## Compose into a hook

`useContext` composes naturally inside a factory hook — one call, fully typed, no boilerplate in the component:

```ts
// counter.hooks.ts
export function useCounter() {
  const storeRef = useContext(CounterContext);
  const getCount = useSelector(() => storeRef.current, s => s.count);

  return {
    get count() { return getCount() ?? 0; },
    increment: () => storeRef.current.actions.increment(),
    decrement: () => storeRef.current.actions.decrement(),
  };
}

// In the component:
readonly #c = useCounter();
```

## Component tree

Multiple independent providers create isolated scopes. Consumers outside any provider fall back to the singleton.

```mermaid
graph TD
    Root --> GA["app-ctx-counter-group<br/>Provider — Store A"]
    GA --> C1["app-ctx-counter<br/>→ Store A"]
    GA --> C2["app-ctx-counter<br/>→ Store A"]
    Root --> GB["app-ctx-counter-group<br/>Provider — Store B"]
    GB --> C3["app-ctx-counter<br/>→ Store B"]
    Root --> C4["app-ctx-counter<br/>→ singleton fallback"]

    style Root fill:#f0f0f0,stroke:#aaaaaa,color:#1a1a1a
    style GA fill:#d4e9ff,stroke:#7aaddd,color:#1a1a1a
    style GB fill:#e4d4f0,stroke:#9d7add,color:#1a1a1a
    style C1 fill:#d4f0d4,stroke:#7acc7a,color:#1a1a1a
    style C2 fill:#d4f0d4,stroke:#7acc7a,color:#1a1a1a
    style C3 fill:#f0e4d4,stroke:#cc9966,color:#1a1a1a
    style C4 fill:#ffd4e4,stroke:#dd7a9d,color:#1a1a1a
```

Full working example: [context/counter](../../apps/stencil-playground/src/examples/context/counter/).
