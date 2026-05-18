# @ssv/stencil-ui

> Stencil UI primitives — registry-driven composition with `ssv-compose`.

## Installation

```bash
pnpm add @ssv/stencil-ui @ssv/stencil.core
```

**Peer dependency:** `@stencil/core >=4.0.0`

Add `@ssv/stencil-ui` to your Stencil app dependencies so its component collection is included in the build.

Registry APIs live on a separate entry point:

```bash
# already included when you install @ssv/stencil-ui
import { compositionRegistry } from "@ssv/stencil-ui/compose";
```

## Quick start

### 1. Register compositions

```ts
// compose-definitions.ts (module scope)
import { compositionRegistry } from "@ssv/stencil-ui/compose";

type TimerData = { duration: number };

compositionRegistry
  .register<TimerData>("timer", { tag: "app-compose-timer", aliases: ["countdown"] })
  .register("count", { tag: "app-compose-counter" });
```

### 2. Provider + compose element

```tsx
<ssv-compose-provider registry={demoCompositionRegistry}>
  <ssv-compose name="timer" data={{ duration: 30 }} />
</ssv-compose-provider>
```

Omit `registry` on the provider to use an isolated empty registry (tests). The global singleton `compositionRegistry` is the default context when no provider overrides it.

### 3. Wrapper components (your app)

Wrappers live in `apps/*` with the `app-` tag prefix. They accept `@Prop() data` and bubble output:

```tsx
@Event() ssvComposeOutput!: EventEmitter<{ isRunning: boolean }>;
```

`ssv-compose` listens for `ssvComposeOutput` and re-emits `widgetEvent` as `{ name, data }`.

## Source layout

```text
libs/stencil-ui/src/compose/
  index.ts              # @ssv/stencil-ui/compose (registry API)
  types.ts
  registry/
    registry.ts
    context.ts
  compose.tsx           # ssv-compose
  compose.css
  compose-provider.tsx  # ssv-compose-provider
```

## Package entry points

| Subpath | Purpose |
| --- | --- |
| `@ssv/stencil-ui` | Stencil collection — `ssv-compose`, `ssv-compose-provider`, `loader`, `hydrate` |
| `@ssv/stencil-ui/compose` | `createCompositionRegistry`, `compositionRegistry`, `CompositionRegistryContext`, types |

## API (`@ssv/stencil-ui/compose`)

| Export | Description |
| --- | --- |
| `createCompositionRegistry()` | New isolated registry |
| `compositionRegistry` | Global singleton (default context) |
| `CompositionRegistryContext` | Context token for `provideContext` / `useContext` |
| `CompositionDefinition<TData>` | `{ tag, mapData?, aliases? }` |
| `ComposeEventDetail` | `{ name, data }` on `widgetEvent` |

`register(name, definition)` returns the registry for chaining.

## Components

| Tag | Purpose |
| --- | --- |
| `ssv-compose` | Resolve `name` + `data` → `h(tag, props)` |
| `ssv-compose-provider` | Provide `CompositionRegistry` to descendants |

Unknown names render the **`error` slot**.

## Build

```bash
pnpm nx run stencil-ui:build
```

## Examples

- [compose demo](../../apps/stencil-playground/src/examples/compose/)
- [Vike page](../../apps/vike-playground/src/pages/stencil-ui/compose/+Page.tsx)
