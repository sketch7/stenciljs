# @ssv/stencil.core

Core utilities for hosting lifecycle-aware controllers and tree-scoped context in [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/stencil.core
```

**Peer dependency:** `@stencil/core >=4`

## API

| Export            | Kind  | Purpose                                                 |
| ----------------- | ----- | ------------------------------------------------------- |
| `SsvElement`      | class | Base class with controller support (single inheritance) |
| `SsvElementMixin` | mixin | Same as `SsvElement` but composable via `Mixin()`       |
| `Ref<T>`          | type  | Callable reactive ref — `ref()` or `ref.current`        |
| `createRef`       | fn    | Creates a `Ref<T>` backed by a getter function          |

## Usage

See [docs/hooks.md](docs/hooks.md) for the full `use()` guide — forms, examples, and host context internals.
See [docs/context.md](docs/context.md) for the tree-scoped context API — `createContext`, `provideContext`, `useContext`, and composing into hooks.
See [docs/transfer-state.md](docs/transfer-state.md) for SSR state serialization — `provideTransferState`, `useTransferState`, and shadow DOM hydration.

## Examples

Full working examples: [mouse-host](../../apps/stencil-playground/src/examples/ssv-core/mouse-host/), [timer-host](../../apps/stencil-playground/src/examples/ssv-core/timer-host/), [context/counter](../../apps/stencil-playground/src/examples/context/counter/).
