# @ssv/tanstack.stencil-store

TanStack Store bindings for [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/tanstack.stencil-store
```

**Peer dependencies:** `@stencil/core >=4`, `@ssv/stencil.core`, `@tanstack/store`

## Prerequisites

Extend `SsvElement` (or apply `SsvElementMixin`) from [`@ssv/stencil.core`](../stencil.core/README.md).

```ts
@Component({ tag: "my-counter", shadow: true })
export class MyCounter extends SsvElement { ... }
```

## API

| Export               | Kind      | Purpose                                                                |
| -------------------- | --------- | ---------------------------------------------------------------------- |
| `useSelector`        | function  | Subscribe to a store or atom, optionally projecting a slice            |
| `useAtom`            | function  | Subscribe to a writable atom and get a paired setter                   |
| `SelectionSource`    | type      | Minimal interface satisfied by any TanStack atom or store              |
| `UseSelectorOptions` | type      | Options bag shared by both hooks (`compare`)                           |
| `createStore`        | re-export | Re-exported from `@tanstack/store`                                     |
| `createAtom`         | re-export | Re-exported from `@tanstack/store`                                     |
| _all others_         | re-export | Everything else from `@tanstack/store` is re-exported at the same path |

## Usage

### `useSelector` — store slice

```ts
// counter.store.ts
export const counterStore = createStore({ count: 0, step: 1 });
```

```tsx
// counter.tsx
@Component({ tag: "app-counter", shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useSelector(this, () => counterStore, (s) => s.count);

  render() {
    return <span>{this.#count()}</span>;
  }
}
```

### `useSelector` — readonly atom

```ts
// counter.store.ts
export const countAtom = createAtom(0);
export const doubledAtom = createAtom(() => countAtom.get() * 2);
```

```tsx
// counter.tsx
@Component({ tag: "app-counter", shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useSelector(this, () => countAtom);
  readonly #doubled = useSelector(this, () => doubledAtom);
}
```

### `useAtom` — read + write

```ts
// counter.store.ts
export const countAtom = createAtom(0);
```

```tsx
// counter.tsx
@Component({ tag: "app-counter", shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useAtom(this, () => countAtom);

  render() {
    return (
      <div>
        <span>{this.#count.value}</span>
        <button onClick={() => this.#count.set((p) => p + 1)}>+</button>
        <button onClick={() => this.#count.set((p) => p - 1)}>−</button>
      </div>
    );
  }
}
```

### Custom equality

```ts
readonly #items = useSelector(this, () => listStore, (s) => s.items, {
  compare: (a, b) => a?.length === b?.length,
});
```

## Differences from React

| React (`@tanstack/react-store`)  | Stencil (`@ssv/tanstack.stencil-store`)     |
| -------------------------------- | ------------------------------------------- |
| `useSelector(source, selector?)` | `useSelector(host, getSource, selector?)`   |
| `useAtom(atom)` → `[value, set]` | `useAtom(host, getAtom)` → `{ value, set }` |
| Source passed directly           | Source returned by a factory (`getSource`)  |
