# @ssv/stencil-ui

> Registry-driven Stencil web components — render a compose by **name** and **data**, with typed wrappers and normalized output events.

[![license](https://img.shields.io/npm/l/@ssv/stencil-ui.svg)](LICENSE)

## Installation

```bash
pnpm add @ssv/stencil-ui @ssv/stencil.core
```

**Peer dependencies:** `@stencil/core >=4.0.0`, `@ssv/stencil.core` (workspace or published)

Add the package to your Stencil app so its component collection is included in the build (same as any `libs/` dependency in this monorepo). Then import registry helpers where you register composes:

```ts
import { createCompositionDefs, registerCompositionDefs } from "@ssv/stencil-ui/compose";
```

## Quick start

### 1. Define a static catalog

```ts
// compose-defs.ts
import {
  createCompositionDefs,
  registerCompositionDefs,
  type CompositionNameOf,
} from "@ssv/stencil-ui/compose";

export const appCompositionDefs = createCompositionDefs({
  timer: { tag: "ssv-timer-widget", aliases: ["countdown"] },
  count: { tag: "ssv-count-widget" },
});

export type AppCompositionName = CompositionNameOf<typeof appCompositionDefs>;
// "timer" | "count" | "countdown"
```

### 2. Global registry (SSR / hard refresh)

Import the defs module from your Stencil **`global.ts`** so registration runs on the server and on every client load:

```ts
// global.ts
import "./compose-defs";
```

```ts
// compose-defs.ts (side effect at module load)
registerCompositionDefs(appCompositionDefs);
```

Any `<ssv-compose>` without a scoped provider uses the global `composeRegistry` singleton.

### 3. Scoped registry (subtree)

On an `SsvElement` host, call `provideCompositionRegistry` as a field initializer:

```tsx
import { SsvElement } from "@ssv/stencil.core";
import { provideCompositionRegistry } from "@ssv/stencil-ui/compose";

@Component({ tag: "app-dashboard" })
export class AppDashboard extends SsvElement {
  readonly #registry = provideCompositionRegistry(appCompositionDefs);

  render() {
    return <ssv-compose name="timer" data={{ duration: 30 }} />;
  }
}
```

Fluent setup is also supported:

```ts
readonly #registry = provideCompositionRegistry(r =>
  r.register("timer", { tag: "ssv-timer-widget" }),
);
```

### 4. Render by name + data

```tsx
<ssv-compose
  name="timer"
  data={{ duration: 30 }}
  onComposeEvent={e => console.log(e.detail)}
/>
```

Unknown names render the **`error` slot** instead of throwing. In development, `ssv-compose` also logs a console warning listing known primary keys from the active registry.

```tsx
<ssv-compose name="missing">
  <span slot="error">Widget not registered</span>
</ssv-compose>
```

## Components

| Tag                             | Extends      | Purpose                                                                                     |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `ssv-compose`                   | `SsvElement` | Resolves `name` in the registry and renders the matching custom element via `h(tag, props)` |
| `ssv-compose-registry-provider` | `SsvElement` | Legacy provider — prefer `provideCompositionRegistry` on hosts                              |

Both require a host that supports reactive controllers and context (`SsvElement` or `Mixin(SsvElementMixin)`).

## Wrapper components (your widgets)

Each registry entry points at a **wrapper** custom element you own (`ssv-*` in `libs/`, `app-*` in apps per monorepo conventions).

**Input:** pass data with `@Prop() data` (default) or custom props via `mapData` (see below).

**Output:** bubble a single normalized event so parents do not listen to every inner tag:

```tsx
@Component({ tag: "ssv-timer-widget", shadow: false })
export class SsvTimerWidget {
  @Prop() data!: { duration: number };
  @Event() ssvComposeOutput!: EventEmitter<{ isRunning: boolean }>;

  render() {
    return (
      <app-timer
        duration={this.data.duration}
        onIsRunningChange={(e: CustomEvent<boolean>) =>
          this.ssvComposeOutput.emit({ isRunning: e.detail })
        }
      />
    );
  }
}
```

`ssv-compose` listens for `ssvComposeOutput`, stops propagation, and re-emits **`composeEvent`** with `{ name, data }` where `name` is the registry key and `data` is the wrapper's payload.

## Registry API

| Export                                        | Description                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `createCompositionDefs(defs)`                 | Preserves literal keys for `CompositionNameOf` inference.                                            |
| `registerCompositionDefs(defs, registry?)`    | Bulk-register a defs map. Defaults to global `composeRegistry`.                                      |
| `provideCompositionRegistry(setup)`           | Scoped registry + `provideContext` on an `SsvElement` host.                                          |
| `useCompositionRegistry()`                    | Consume nearest registry (or global fallback).                                                       |
| `defineCompose(type, options, registry?)`     | Register one entry. Alias for `registry.register(...)`.                                              |
| `createComposeRegistry()`                     | New isolated `Map`-backed registry.                                                                  |
| `composeRegistry`                             | Global singleton used when no provider overrides context.                                            |
| `ComposeRegistryContext`                      | Context token from `@ssv/stencil.core` (`createContext`). Default factory returns `composeRegistry`. |

All of the above are exported from `@ssv/stencil-ui/compose`.

### Duplicate registration

**Policy: last wins.** Re-registering a primary key or alias overwrites the previous entry. This keeps HMR and intentional overrides predictable. In development, the registry logs a `console.warn` when overwriting an existing key; production builds do not warn.

### `ComposeDefinition<TData>`

| Field      | Description                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| `tag`      | Custom element tag passed to Stencil's `h()`                                                  |
| `mapData?` | `(data: TData) => Record<string, unknown>` — return value becomes props instead of `{ data }` |
| `aliases?` | Extra names that resolve to the same definition (e.g. `"countdown"` → `"timer"`)              |

```ts
defineCompose<TimerData>("timer", {
  tag: "app-timer",
  mapData: d => ({ duration: d.duration, isRunning: false }),
});
```

### Types

```ts
type CompositionNameOf<TDefs> = /* keys of TDefs + all alias strings */;

type ComposeEventDetail<TOutput = unknown> = {
  name: string; // registry name on ssv-compose
  data: TOutput; // wrapper's ssvComposeOutput detail
};
```

## Passing data from a host

Use `CompositionNameOf<typeof yourDefs>` for typed tab state and payload helpers:

```ts
#data(active: AppCompositionName): unknown {
  switch (active) {
    case "timer":
    case "countdown":
      return { duration: 30 };
    case "count":
      return {};
    default:
      return {};
  }
}

// render()
<ssv-compose name={this.active} data={this.#data(this.active)} />
```

`ssv-compose` keeps `@Prop() name!: string` at the component boundary so generic consumers are not tied to your defs map.

## Context and multiple registries

```
SsvElement host  →  provideCompositionRegistry(defs | fn)
        │
        └── ssv-compose  →  useCompositionRegistry().resolve(name)
```

- **Global:** `registerCompositionDefs(...)` in a module imported from `global.ts`.
- **Scoped:** `provideCompositionRegistry(...)` on an `SsvElement` ancestor.
- **Legacy:** `ssv-compose-registry-provider` (prefer `provideCompositionRegistry` for new code).

## Build

```bash
pnpm nx run stencil-ui:build
pnpm nx run stencil-ui:dev    # watch
```

Outputs: `dist/` (collection + types), `loader/`, `hydrate/` for SSR.

## Examples

Full demo in the monorepo:

- [compose demo](../../apps/stencil-playground/src/examples/compose/) — typed defs, scoped + global sections, dev resolve warnings
- [Vike page](../../apps/vike-playground/src/pages/compose/+Page.tsx) — React host around the demo

Registry setup: [compose-defs.ts](../../apps/stencil-playground/src/examples/compose/compose-defs.ts) (imported from [global.ts](../../apps/stencil-playground/src/global.ts)).

## Related

- [@ssv/stencil.core](../stencil.core/README.md) — `SsvElement`, `useContext`, `provideContext`
- [Stencil component development skill](../../.github/skills/stenciljs-component-development/SKILL.md) — tag prefixes (`ssv-` / `app-`), vertical slices
