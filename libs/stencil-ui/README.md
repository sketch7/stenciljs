# @ssv/stencil-ui

[![license](https://img.shields.io/npm/l/@ssv/stencil-ui.svg)](LICENSE)

```bash
pnpm add @ssv/stencil-ui @ssv/stencil.core
```

**Peer deps:** `@stencil/core >=4.0.0`, `@ssv/stencil.core`

```ts
import { createCompositionDefs, provideCompositionRegistry } from "@ssv/stencil-ui/compose";
```

## Compose system

`ssv-compose` resolves a registry name to a custom element tag and renders it with `data` as props. Every output event is normalized into a single `composeEvent`.

**Why use it?**

- Config-driven / CMS UIs where the component to render is determined at runtime.
- Dashboard panels with pluggable widget slots — the host owns the registry, panels stay decoupled.
- Feature flags or A/B variants — swap the tag behind a name without changing template markup.
- Design system shells — render any registered component from a name/data pair without hard imports at the render site.

### Minimal example

```ts
// compose-defs.ts
import { createCompositionDefs, type CompositionNameOf } from "@ssv/stencil-ui/compose";

export const defs = createCompositionDefs({
  timer: { tag: "app-timer", aliases: ["countdown"] },
  count: { tag: "app-signals-counter" },
});

export type ComposeName = CompositionNameOf<typeof defs>;
// "timer" | "count" | "countdown"
```

```tsx
// dashboard.tsx
@Component({ tag: "app-dashboard" })
export class AppDashboard extends SsvElement {
  readonly composeRegistry = provideCompositionRegistry(defs);

  render() {
    return <ssv-compose name="timer" data={{ duration: 30 }} />;
  }
}
```

```tsx
<ssv-compose
  name="timer"
  data={{ duration: 30 }}
  onComposeEvent={e => console.log(e.detail)}
/>
```

---

## Composition modes

`ssv-compose` chooses how to pass `data` and capture outputs based on what it knows about the resolved element class:

| Mode | When | Props passed | Output forwarding |
|---|---|---|---|
| **Direct** | element class not a `ComposeWidget` | `data` spread as props | all `CustomEvent`s auto-forwarded as `composeEvent` with `eventName` |
| **Wrapper** | element class extends `ComposeWidget` | `{ data }` as a single prop | listens for `ssvComposeOutput` event |
| **`mapData`** | `mapData` set in def (any mode) | return value of `mapData(data)` | determined by mode |
| **`mapOutputs`** | set in def (direct only) | spread (unless `mapData`) | only mapped events forwarded; auto-forwarding disabled |

### Direct mode — use an existing component as-is

No wrapper needed. `data` is spread directly as props. All custom events are auto-intercepted and re-emitted as `composeEvent` with the original `eventName`:

```ts
const defs = createCompositionDefs({
  counter: { tag: "app-signals-counter" },
});
```

```tsx
<ssv-compose name="counter" data={{ step: 2 }} onComposeEvent={e => console.log(e.detail)} />
// e.detail → { name: "counter", eventName: "myCustomEvent", data: <event detail> }
```

Use `mapData` to control exactly which props get set when the `data` shape differs from the component's prop signature:

```ts
const defs = createCompositionDefs({
  timer: {
    tag: "app-timer",
    mapData: (d: { duration: number }) => ({ duration: d.duration, autoStart: true }),
  },
});
```

Use `mapOutputs` to selectively capture events instead of forwarding everything:

```ts
const defs = createCompositionDefs({
  timer: {
    tag: "app-timer",
    mapOutputs: {
      // key is the DOM event name; return value becomes composeEvent.data
      isRunningChange: (e: CustomEvent<boolean>) => ({ isRunning: e.detail }),
    },
  },
});
// emits: { name: "timer", data: { isRunning: true } }
```

### Wrapper mode — encapsulate mapping in a component

Extend `ComposeWidget` so `ssv-compose` recognizes the class at runtime and passes `data` as a single typed prop instead of spreading it. The wrapper then maps `data` to child props and emits `ssvComposeOutput` for outputs:

```tsx
// timer/timer-widget.tsx
import { ComposeWidget } from "@ssv/stencil-ui/compose";
import { Component, Event, EventEmitter, Prop, h } from "@stencil/core";

export type TimerWidgetData = { duration: number; autoStart?: boolean };
export type TimerWidgetOutput = { elapsed: number };

@Component({ tag: "app-timer-widget", shadow: false })
export class AppTimerWidget extends ComposeWidget {
  @Prop() data!: TimerWidgetData;
  @Event() ssvComposeOutput!: EventEmitter<TimerWidgetOutput>;

  render() {
    return (
      <app-timer
        duration={this.data.duration}
        autoStart={this.data.autoStart ?? false}
        onElapsed={(e: CustomEvent<number>) =>
          this.ssvComposeOutput.emit({ elapsed: e.detail })
        }
      />
    );
  }
}
```

```ts
const defs = createCompositionDefs({
  timer: { tag: "app-timer-widget" },
});
// ssv-compose passes { data: { duration: 30 } }
// ssvComposeOutput is caught and re-emitted as composeEvent: { name: "timer", data: { elapsed: 5 } }
```

**When to choose wrapper vs. direct:**

- Use **direct + `mapOutputs`** for simple components where you only need to rename/transform a couple of events.
- Use **direct** (no `mapOutputs`) when you want all custom events forwarded automatically and the data shape already matches the component's props.
- Use **wrapper** when mapping logic is complex, you need to compose multiple children, or you want full type safety on `data` inside the wrapper.

---

## Registry

### Define a typed catalog

`createCompositionDefs` preserves literal keys so `CompositionNameOf` gives you a union of all names and aliases:

```ts
import { createCompositionDefs, type CompositionNameOf } from "@ssv/stencil-ui/compose";

export const defs = createCompositionDefs({
  timer: { tag: "app-timer-widget", aliases: ["countdown", "kitchen-timer"] },
  table: { tag: "app-data-table" },
});

export type WidgetName = CompositionNameOf<typeof defs>;
// "timer" | "table" | "countdown" | "kitchen-timer"
```

### Scoped registry (recommended)

Call `provideCompositionRegistry` as a class field on any `SsvElement` host. All `ssv-compose` descendants within that subtree resolve names from this registry:

```tsx
@Component({ tag: "app-dashboard" })
export class AppDashboard extends SsvElement {
  // accepts a defs map directly
  readonly composeRegistry = provideCompositionRegistry(defs);
  // or a fluent setup function
  readonly composeRegistry = provideCompositionRegistry(r =>
    r.register("timer", { tag: "app-timer-widget" })
     .register("table", { tag: "app-data-table" }),
  );
}
```

Multiple independent subtrees can each have their own scoped registry.

### Programmatic registration

```ts
import { createComposeRegistry } from "@ssv/stencil-ui/compose";

const registry = createComposeRegistry();
registry.register("timer", { tag: "app-timer-widget" });
registry.registerFromDefs(defs);         // bulk
```

**Duplicate policy: last wins.** Re-registering a key overwrites the previous definition. In development a `console.warn` is emitted; in production no warning is logged.

---

## `ComposeEventDetail`

Every event emitted by `ssv-compose` has this shape:

```ts
type ComposeEventDetail<TOutput = unknown> = {
  name: string;        // the name prop on ssv-compose
  eventName?: string;  // set in direct mode; the DOM event name from the child element
  data: TOutput;       // payload from ssvComposeOutput, mapOutputs, or direct event detail
};
```

```tsx
<ssv-compose
  name={activeWidget}
  data={widgetData}
  onComposeEvent={(e: CustomEvent<ComposeEventDetail>) => {
    const { name, eventName, data } = e.detail;
    // eventName is set in direct mode (no wrapper / no mapOutputs)
  }}
/>
```

---

## Aliases

Aliases let consumers use stable strings while the underlying tag can change:

```ts
const defs = createCompositionDefs({
  timer: {
    tag: "app-timer-widget",
    aliases: ["countdown", "kitchen-timer"],
  },
});
```

`"countdown"` and `"kitchen-timer"` resolve to the same definition as `"timer"`. All three appear in `CompositionNameOf<typeof defs>`. Only primary keys appear in dev warning messages (not aliases).

---

## Error slot

Unknown names render the `error` slot instead of throwing. In development, a `console.warn` lists all registered primary keys:

```tsx
<ssv-compose name="missing">
  <span slot="error">Widget not found</span>
</ssv-compose>
```

```
[compose] No definition for name "missing". Known types: timer, table
```

---

## Multiple registries

Nest providers to override the registry for a sub-tree without affecting siblings:

```
AppRoot  (no provider — default global registry)
├── AppDashboard  provideCompositionRegistry(dashboardDefs)
│   ├── ssv-compose name="timer"  → resolved from dashboardDefs ✓
│   └── ssv-compose name="table"  → resolved from dashboardDefs ✓
└── AppSidebar  provideCompositionRegistry(sidebarDefs)
    └── ssv-compose name="nav"    → resolved from sidebarDefs ✓
```

---

## Typed data helper pattern

Use `CompositionNameOf` and a switch to build typed data objects without casting:

```ts
#data(active: WidgetName): unknown {
  switch (active) {
    case "timer":
    case "countdown":
    case "kitchen-timer":
      return { duration: 30 };
    case "table":
      return { rows: this.rows, columns: this.columns };
    default:
      return {};
  }
}

// render()
<ssv-compose name={this.active} data={this.#data(this.active)} />
```

---

## API reference

### `@ssv/stencil-ui/compose` exports

| Export | Kind | Description |
|---|---|---|
| `createCompositionDefs(defs)` | function | Preserves literal keys for `CompositionNameOf` inference |
| `provideCompositionRegistry(setup)` | function | Scoped registry via context on `SsvElement` host |
| `useCompositionRegistry()` | hook | Consume nearest registry from context |
| `createComposeRegistry()` | function | New isolated registry instance |
| `ComposeWidget` | class | Extend to signal wrapper mode to `ssv-compose` |
| `CompositionNameOf<TDefs>` | type | Union of all primary keys and alias strings |
| `ComposeDef<TData>` | type | Registry entry shape (`tag`, `mapData?`, `mapOutputs?`, `aliases?`) |
| `ComposeEventDetail<TOutput>` | type | `{ name, eventName?, data }` — emitted by `ssv-compose` |
| `ComposeRegistry` | type | Registry interface (`register`, `registerFromDefs`, `resolve`, `listTypes`) |
| `CompositionDefsMap` | type | `Record<string, ComposeDef>` |

### `ssv-compose` props

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Registry key to resolve |
| `data` | `unknown` | Passed to the widget; shape depends on composition mode |

### `ssv-compose` events

| Event | Detail | Description |
|---|---|---|
| `composeEvent` | `ComposeEventDetail` | Normalized output from any registered widget |

### `ComposeDef<TData>` fields

| Field | Type | Description |
|---|---|---|
| `tag` | `string` | Custom element tag passed to `h()` |
| `mapData?` | `(data: TData) => Record<string, unknown>` | Maps data to explicit props; bypasses default spreading |
| `mapOutputs?` | `Record<eventName, (e: CustomEvent) => unknown>` | Maps direct component events to `composeEvent.data` |
| `aliases?` | `string[]` | Additional names that resolve to this same definition |

---

## Build

```bash
pnpm nx run stencil-ui:build
pnpm nx run stencil-ui:dev    # watch
```

## Examples

- [compose demo](../../apps/stencil-playground/src/examples/compose/) — typed defs, scoped registry, alias resolution, event log
- [Vike page](../../apps/vike-playground/src/pages/compose/+Page.tsx) — React host consuming the demo

## Related

- [@ssv/stencil.core](../stencil.core/README.md) — `SsvElement`, `useContext`, `provideContext`
- [Stencil component development skill](../../.github/skills/stenciljs-component-development/SKILL.md) — tag prefixes (`ssv-` / `app-`), vertical slices

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
  r.register("timer", { tag: "app-timer-widget" }),
);
```

### 3. Render by name + data

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

| Tag           | Extends      | Purpose                                                                                     |
| ------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `ssv-compose` | `SsvElement` | Resolves `name` in the registry and renders the matching custom element via `h(tag, props)` |

Both require a host that supports reactive controllers and context (`SsvElement` or `Mixin(SsvElementMixin)`).

## Wrapper components (your widgets)

Each registry entry can point at a **wrapper** custom element you own (`ssv-*` in `libs/`, `app-*` in apps per monorepo conventions) or at a direct component tag with `mapData`/`mapOutputs`.

**Input:** pass data with `@Prop() data` (default) or custom props via `mapData` (see below).

**Output (wrapper mode):** bubble a single normalized event so parents do not listen to every inner tag:

```tsx
@Component({ tag: "app-timer-widget", shadow: false })
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

**Output (direct mode):** map inner component events directly in registry defs:

```ts
registry.register("timer", {
  tag: "app-timer",
  mapOutputs: {
    isRunningChange: (e: CustomEvent<boolean>) => ({ isRunning: e.detail }),
  },
});
```

## Registry API

| Export                                     | Description                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `createCompositionDefs(defs)`              | Preserves literal keys for `CompositionNameOf` inference.                                            |
| `provideCompositionRegistry(setup)`        | Scoped registry + `provideContext` on an `SsvElement` host.                                          |
| `useCompositionRegistry()`                 | Consume nearest registry (or global fallback).                                                       |
| `createComposeRegistry()`                  | New isolated `Map`-backed registry.                                                                  |
| `composeRegistry`                          | Global singleton used when no provider overrides context.                                            |
| `ComposeRegistryContext`                   | Context token from `@ssv/stencil.core` (`createContext`). Default factory returns `composeRegistry`. |

All of the above are exported from `@ssv/stencil-ui/compose`.

### Duplicate registration

**Policy: last wins.** Re-registering a primary key or alias overwrites the previous entry. This keeps HMR and intentional overrides predictable. In development, the registry logs a `console.warn` when overwriting an existing key; production builds do not warn.

### `ComposeDefinition<TData>`

| Field      | Description                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| `tag`      | Custom element tag passed to Stencil's `h()`                                                  |
| `mapData?` | `(data: TData) => Record<string, unknown>` — return value becomes props instead of `{ data }` |
| `mapOutputs?` | `Record<eventName, (event: CustomEvent) => unknown>` — emits `composeEvent` from direct tags |
| `aliases?` | Extra names that resolve to the same definition (e.g. `"countdown"` → `"timer"`)              |

```ts
registry.register("timer", {
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

- **Scoped:** `provideCompositionRegistry(...)` on an `SsvElement` ancestor.

## Build

```bash
pnpm nx run stencil-ui:build
pnpm nx run stencil-ui:dev    # watch
```

Outputs: `dist/` (collection + types), `loader/`, `hydrate/` for SSR.

## Examples

Full demo in the monorepo:

- [compose demo](../../apps/stencil-playground/src/examples/compose/) — typed defs, scoped registry, dev resolve warnings
- [Vike page](../../apps/vike-playground/src/pages/compose/+Page.tsx) — React host around the demo

Registry setup: [compose-defs.ts](../../apps/stencil-playground/src/examples/compose/compose-defs.ts)

## Related

- [@ssv/stencil.core](../stencil.core/README.md) — `SsvElement`, `useContext`, `provideContext`
- [Stencil component development skill](../../.github/skills/stenciljs-component-development/SKILL.md) — tag prefixes (`ssv-` / `app-`), vertical slices
