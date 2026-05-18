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

**Declarative map** (recommended for static defs):

```ts
// compose-Defs.ts (module scope)
import type { CompositionDefsMap } from "@ssv/stencil-ui/compose";

export const demoCompositionDefs = {
  timer: { tag: "app-compose-timer", aliases: ["countdown"] },
  count: { tag: "app-compose-counter" },
} satisfies CompositionDefsMap;
```

**Fluent setup callback** in a host field initializer:

```ts
import { SsvElement } from "@ssv/stencil.core";
import { provideCompositionRegistry } from "@ssv/stencil-ui/compose";

export class AppComposeDemo extends SsvElement {
  readonly #registry = provideCompositionRegistry(r =>
    r
      .register("timer", { tag: "app-compose-timer", aliases: ["countdown"] })
      .register("count", { tag: "app-compose-counter" }),
  );
}
```

**Pre-built registry** at module scope:

```ts
export const demoCompositionRegistry = createCompositionRegistry()
  .register("timer", { tag: "app-compose-timer" });

readonly #registry = provideCompositionRegistry(demoCompositionRegistry);
```

**Global singleton** (no provider — default context):

```ts
import { compositionRegistry } from "@ssv/stencil-ui/compose";

compositionRegistry.register("timer", { tag: "app-compose-timer" });
```

### 2. Compose element

```tsx
<ssv-compose name="timer" data={{ duration: 30 }} />
```

Call `provideCompositionRegistry()` on an `SsvElement` host to scope a registry to descendants. Omit it to use the global `compositionRegistry` singleton.

### 3. Wrapper components (your app)

Wrappers live in `apps/*` with the `app-` tag prefix. They accept `@Prop() data` and bubble output:

```tsx
@Event() ssvComposeOutput!: EventEmitter<{ isRunning: boolean }>;
```

`ssv-compose` listens for `ssvComposeOutput` and re-emits `event` as `{ name, data }`.

## Source layout

```text
libs/stencil-ui/src/compose/
  index.ts              # @ssv/stencil-ui/compose (registry API)
  types.ts
  registry/
    registry.ts
    context.ts
    provide-registry.ts
  compose.tsx           # ssv-compose
  compose.css
```

## Package entry points

| Subpath                   | Purpose                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `@ssv/stencil-ui`         | Stencil collection — `ssv-compose`, `loader`, `hydrate`              |
| `@ssv/stencil-ui/compose` | Registry API, `provideCompositionRegistry`, `useCompositionRegistry` |

## API (`@ssv/stencil-ui/compose`)

| Export                              | Description                                            |
| ----------------------------------- | ------------------------------------------------------ |
| `createCompositionRegistry()`       | New isolated registry                                  |
| `compositionRegistry`               | Global singleton (default context)                     |
| `provideCompositionRegistry(...)`   | Provide registry to descendants (field initializer)    |
| `useCompositionRegistry(registry?)` | Consume nearest registry (optional override for tests) |
| `CompositionRegistryContext`        | Context token                                          |
| `CompositionDef<TData>`             | `{ tag, mapData?, aliases? }`                          |
| `CompositionDefsMap`                | Declarative name → Def record                          |
| `CompositionDefsList`               | Ordered `[name, def]` tuples                           |
| `ComposeEventDetail`                | `{ name, data }` on `event`                            |

`register(name, def)` returns the registry for chaining.

## Components

| Tag           | Purpose                                   |
| ------------- | ----------------------------------------- |
| `ssv-compose` | Resolve `name` + `data` → `h(tag, props)` |

Unknown names render the **`error` slot**.

## Build

```bash
pnpm nx run stencil-ui:build
```

## Examples

- [compose demo](../../apps/stencil-playground/src/examples/compose/)
- [Vike page](../../apps/vike-playground/src/pages/stencil-ui/compose/+Page.tsx)
