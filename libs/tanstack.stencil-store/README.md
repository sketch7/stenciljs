# @ssv/tanstack.stencil-store

TanStack Store bindings for [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/tanstack.stencil-store
```

**Peer dependencies:** `@stencil/core >=4`, `@ssv/stencil.core`, `@tanstack/store`, and optionally `@ssv/stencil-signals` (required for `useSelectorSignal` / `useAtomSignal`).

## Prerequisites

Extend `SsvElement` (or apply `SsvElementMixin`) from [`@ssv/stencil.core`](../stencil.core/README.md).

```ts
@Component({ tag: "my-counter", shadow: true })
export class MyCounter extends SsvElement { ... }
```

## API

| Export                     | Kind      | Purpose                                                                                                                                                                     |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSelector`              | function  | Subscribe to a store or atom, optionally projecting a slice                                                                                                                 |
| `useSelectorSignal`        | function  | Same subscription model as `useSelector`, but exposes a readonly stencil `Signal` (needs `@ssv/stencil-signals` + `SignalWatcherMixin` / `useSignalController` for renders) |
| `useAtom`                  | function  | Subscribe to a writable atom and get a paired setter                                                                                                                        |
| `useAtomSignal`            | function  | Writable stencil `WritableSignal` mirrored from / forwarded to a TanStack atom                                                                                              |
| `SelectionSource`          | type      | Minimal interface satisfied by any TanStack atom or store                                                                                                                   |
| `UseSelectorOptions`       | type      | Options bag shared by hooks (`compare`)                                                                                                                                     |
| `UseSelectorSignalOptions` | type      | Alias of `UseSelectorOptions` for signal selectors                                                                                                                          |
| `UseAtomSignalOptions`     | type      | Alias of `UseSelectorOptions` for atom signals                                                                                                                              |
| `createStore`              | re-export | Re-exported from `@tanstack/store`                                                                                                                                          |
| `createAtom`               | re-export | Re-exported from `@tanstack/store`                                                                                                                                          |
| _all others_               | re-export | Everything else from `@tanstack/store` is re-exported at the same path                                                                                                      |

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
  readonly #count = useSelector(
    () => counterStore,
    s => s.count,
  );

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
  readonly #count = useSelector(() => countAtom);
  readonly #doubled = useSelector(() => doubledAtom);
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

### Custom equality

```ts
readonly #items = useSelector(() => listStore, (s) => s.items, {
  compare: (a, b) => a?.length === b?.length,
});
```

## Signals (`@ssv/stencil-signals`)

TanStack stays the source of truth; `useSelectorSignal` / `useAtomSignal` push snapshots into stencil signals so `computed`, `effect`, and `SignalWatcherMixin` can depend on store state.

- **`compare`** (TanStack style): return **`true`** when the new selected value should **not** trigger downstream updates — same meaning as stencil-signals **`equals`**: **`true`** means “values are the same, skip notification”.
- Install **`@ssv/stencil-signals`** and register a backend (for example import `@ssv/stencil-signals/tc39` once in app startup, as in stencil-playground `global.ts`).
- **`peerDependenciesMeta`** marks `@ssv/stencil-signals` optional so apps that only use `useSelector` / `useAtom` do not need to install it.

### `useSelectorSignal` + `SignalWatcherMixin`

```tsx
import { SignalWatcherMixin } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";
import { createStore, useSelectorSignal } from "@ssv/tanstack.stencil-store";
import { Component, h, Mixin } from "@stencil/core";

const store = createStore({ count: 0 });

@Component({ tag: "app-example", shadow: true })
export class AppExample extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  readonly #count = useSelectorSignal(
    () => store,
    s => s.count,
  );

  render() {
    const n = this.#count() ?? 0;
    return (
      <button
        onClick={() => store.setState(s => ({ ...s, count: s.count + 1 }))}>
        {n}
      </button>
    );
  }
}
```

### Name collision: two different `createStore` helpers

- **`createStore`** from **`@tanstack/store`** (re-exported here) — TanStack’s reactive store API.
- **`createStore`** from **`@ssv/stencil-signals/extensions`** — a reactive Proxy helper for plain objects, unrelated to TanStack.

Import from distinct paths (or use aliases) when both appear in one file.

## Differences from React

| React (`@tanstack/react-store`)  | Stencil (`@ssv/tanstack.stencil-store`)    |
| -------------------------------- | ------------------------------------------ |
| `useSelector(source, selector?)` | `useSelector(getSource, selector?)`        |
| `useAtom(atom)` → `[value, set]` | `useAtom(getAtom)` → `{ value, set }`      |
| Source passed directly           | Source returned by a factory (`getSource`) |
