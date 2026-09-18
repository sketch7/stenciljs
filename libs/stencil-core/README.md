# @ssv/stencil-core

Core utilities for hosting lifecycle-aware controllers and tree-scoped context in [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/stencil-core
```

**Peer dependency:** `@stencil/core >=4`

## Hosting controllers — `SsvElement`

- Use when your component owns one or more `ReactiveController`s or inline `useEffect` calls
- Avoid when you already extend a custom base class — use `SsvElementMixin` with Stencil's `Mixin()` instead

```ts
@Component({ tag: 'ssv-mouse', shadow: true })
export class SsvMouse extends SsvElement {
  readonly #mouse = useMouseController();

  render() {
    return <span>{this.#mouse.pos.x}, {this.#mouse.pos.y}</span>;
  }
}
```

Mixin form when inheritance is already taken:

```ts
export class SsvMouse extends Mixin(SsvElementMixin) { … }
```

## Defining a controller — `use()`

- Use when a feature needs connect/disconnect lifecycle or exposes reactive state
- The `hooks` key enables compile-time typo checking on lifecycle method names

```ts
// mouse-controller.ts
export function useMouseController() {
  return use(host => {
    let pos = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      pos = { x: e.clientX, y: e.clientY };
      host.requestUpdate();
    };
    return {
      hooks: {
        hostConnected: () => window.addEventListener("mousemove", onMove),
        hostDisconnected: () => window.removeEventListener("mousemove", onMove),
      },
      value: { get pos() { return pos; } },
    };
  });
}
```

→ [Full hooks guide](docs/hooks.md) — side-effects-only form, `setup()`, `useLoadEffect`, `ReactiveControllerRef`

## Side effects — `useEffect`

- Use inside an `SsvElement` class body (or `use()` factory) to tie effects to the render lifecycle
- No deps → runs after every render, cleanup before next
- `[]` → runs once on connect, cleanup on disconnect
- Reactive deps → re-runs at render when a dep value changes; paused when a dep is null/undefined

```ts
// once on connect
useEffect(() => {
  const onResize = () => { this._width = window.innerWidth; };
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

// re-runs when `this._id` changes
useEffect(() => {
  fetch(`/api/${this._id}`).then(r => r.json()).then(d => { this._data = d; });
}, [() => this._id]);
```

## Tree-scoped context

- Use to share a value (store, service) down the component tree without prop drilling
- Avoid when the value is truly global — use a module-level singleton instead

**Define:**

```ts
// counter.context.ts
export const CounterContext = createContext<CounterStore>(
  () => createCounterStore(),
  { name: "counter" },
);
```

**Provide (ancestor):**

```ts
export class AppCounterGroup extends SsvElement {
  readonly store = provideContext(CounterContext);
}
```

**Consume (descendant):**

```ts
export class AppCounter extends SsvElement {
  readonly #storeRef = useContext(CounterContext);

  render() {
    const { count } = this.#storeRef.current.state;
    return <span>{count}</span>;
  }
}
```

→ [Full context docs](docs/context.md) — default factories, singleton fallback, composing into hooks

## Other features

- [Transfer state](docs/transfer-state.md) — SSR state serialization (`provideTransferState`, `useTransferState`). Import from `@ssv/stencil-core/transfer-state`.
- [Testing](docs/testing.md) — `TestHost`, `mount`, `DomTestHost`, `mountDom`. Import from `@ssv/stencil-core/testing`.
- [Dev utils](docs/dev.md) — `useLifecycleLogger`. Import from `@ssv/stencil-core/dev`.

## Examples

Full working examples: [mouse-host](../../apps/stencil-playground/src/examples/ssv-core/mouse-host/), [timer-host](../../apps/stencil-playground/src/examples/ssv-core/timer-host/), [context/counter](../../apps/stencil-playground/src/examples/context/counter/).
