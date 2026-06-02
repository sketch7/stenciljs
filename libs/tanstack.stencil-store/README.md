# @ssv/tanstack.stencil-store

TanStack Store bindings for [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/tanstack.stencil-store
```

**Peer dependencies:** `@stencil/core >=4`, `@ssv/stencil-core`, `@tanstack/store`

## Prerequisites

Extend `SsvElement` (or apply `SsvElementMixin`) from [`@ssv/stencil-core`](../stencil-core/README.md).

## `useSelector` — subscribe to a store or atom

- Use when a component needs to re-render on a specific slice of store state
- The selector argument is optional — omit it to subscribe to the whole store value
- Pass a `compare` function to suppress re-renders when the selection is structurally equal

```ts
// counter.store.ts
export const counterStore = createStore({ count: 0, step: 1 });
```

```tsx
@Component({ tag: "app-counter", shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useSelector(() => counterStore, s => s.count);

  render() {
    return <span>{this.#count()}</span>;
  }
}
```

Works with atoms too:

```ts
export const countAtom = createAtom(0);
export const doubledAtom = createAtom(() => countAtom.get() * 2);
```

```tsx
readonly #count = useSelector(() => countAtom);
readonly #doubled = useSelector(() => doubledAtom);
```

## `useAtom` — read + write

- Use when the component needs both the current value and a setter
- Returns `{ value, set }` instead of a tuple (unlike React)

```tsx
@Component({ tag: "app-counter", shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useAtom(() => countAtom);

  render() {
    return (
      <div>
        <span>{this.#count.value}</span>
        <button onClick={() => this.#count.set(p => p + 1)}>+</button>
        <button onClick={() => this.#count.set(p => p - 1)}>−</button>
      </div>
    );
  }
}
```

## Custom equality

```ts
readonly #items = useSelector(() => listStore, s => s.items, {
  compare: (a, b) => a?.length === b?.length,
});
```
