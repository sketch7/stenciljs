# @ssv/stencil.core

Core utilities for hosting lifecycle-aware controllers in [StencilJS](https://stenciljs.com/) components.

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

See [docs/hooks.md](docs/hooks.md) for hook exports (`use`, `ReactiveController`, `ReactiveControllerHost`, `ReactiveControllerHostMixin`).

## Usage

See [docs/hooks.md](docs/hooks.md) for the full `use()` guide — forms, examples, and host context internals.

## Examples

Full working examples: [mouse-host](../../apps/stencil-playground/src/examples/ssv-core/mouse-host/), [timer-host](../../apps/stencil-playground/src/examples/ssv-core/timer-host/).
