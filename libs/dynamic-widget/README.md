# @ssv/dynamic-widget

> Registry-driven Stencil web components — render a widget by **name** and **data**, with typed wrappers and normalized output events.

[![license](https://img.shields.io/npm/l/@ssv/dynamic-widget.svg)](LICENSE)

## Installation

```bash
pnpm add @ssv/dynamic-widget @ssv/stencil.core
```

**Peer dependencies:** `@stencil/core >=4.0.0`, `@ssv/stencil.core` (workspace or published)

Add the package to your Stencil app so its component collection is included in the build (same as any `libs/` dependency in this monorepo). Then import registry helpers where you register widgets:

```ts
import { createWidgetRegistry, defineWidget } from "@ssv/dynamic-widget";
```

## Quick start

### 1. Register widget types

```ts
// widget-definitions.ts (run once at module load, or inside a provider)
import { defineWidget } from "@ssv/dynamic-widget";

type TimerData = { duration: number };

defineWidget<TimerData>("timer", {
  tag: "ssv-timer-widget",
  aliases: ["countdown"],
});

defineWidget("count", { tag: "ssv-count-widget" });
```

### 2. Wrap the tree with a registry (optional)

Use `ssv-widget-registry-provider` when you need an **isolated** registry (per page, per tenant, tests). Omit it to use the **global** singleton populated by `defineWidget()` without a third argument.

```tsx
import { createWidgetRegistry } from "@ssv/dynamic-widget";

const registry = createWidgetRegistry();
// defineWidget("timer", { tag: "ssv-timer-widget" }, registry);

render() {
  return (
    <ssv-widget-registry-provider registry={registry}>
      <ssv-dynamic-widget name="timer" data={{ duration: 30 }} />
    </ssv-widget-registry-provider>
  );
}
```

### 3. Render by name + data

```tsx
<ssv-dynamic-widget
  name="timer"
  data={{ duration: 30 }}
  onWidgetEvent={(e) => console.log(e.detail)}
/>
```

Unknown names render the **`error` slot** instead of throwing:

```tsx
<ssv-dynamic-widget name="missing">
  <span slot="error">Widget not registered</span>
</ssv-dynamic-widget>
```

## Components

| Tag | Extends | Purpose |
| --- | --- | --- |
| `ssv-dynamic-widget` | `SsvElement` | Resolves `name` in the registry and renders the matching custom element via `h(tag, props)` |
| `ssv-widget-registry-provider` | `SsvElement` | Provides a `WidgetRegistry` to descendants via `@ssv/stencil.core` context |

Both require a host that supports reactive controllers and context (`SsvElement` or `Mixin(SsvElementMixin)`).

## Wrapper components (your widgets)

Each registry entry points at a **wrapper** custom element you own (`ssv-*` in `libs/`, `app-*` in apps per monorepo conventions).

**Input:** pass data with `@Prop() data` (default) or custom props via `mapData` (see below).

**Output:** bubble a single normalized event so parents do not listen to every inner tag:

```tsx
@Component({ tag: "ssv-timer-widget", shadow: false })
export class SsvTimerWidget {
  @Prop() data!: { duration: number };
  @Event() ssvWidgetOutput!: EventEmitter<{ isRunning: boolean }>;

  render() {
    return (
      <app-timer
        duration={this.data.duration}
        onIsRunningChange={(e: CustomEvent<boolean>) =>
          this.ssvWidgetOutput.emit({ isRunning: e.detail })
        }
      />
    );
  }
}
```

`ssv-dynamic-widget` listens for `ssvWidgetOutput`, stops propagation, and re-emits **`widgetEvent`** with `{ name, data }` where `name` is the widget’s registry key and `data` is the wrapper’s payload.

## Registry API

| Export | Description |
| --- | --- |
| `defineWidget(type, options, registry?)` | Register a name → definition. Third arg defaults to global `widgetRegistry`. |
| `createWidgetRegistry()` | New isolated `Map`-backed registry. |
| `widgetRegistry` | Global singleton used when no provider overrides context. |
| `WidgetRegistryContext` | Context token from `@ssv/stencil.core` (`createContext`). Default factory returns `widgetRegistry`. |

### `WidgetDefinition<TData>`

| Field | Description |
| --- | --- |
| `tag` | Custom element tag passed to Stencil’s `h()` |
| `mapData?` | `(data: TData) => Record<string, unknown>` — return value becomes props instead of `{ data }` |
| `aliases?` | Extra names that resolve to the same definition (e.g. `"countdown"` → `"timer"`) |

```ts
defineWidget<TimerData>("timer", {
  tag: "app-timer",
  mapData: (d) => ({ duration: d.duration, isRunning: false }),
});
```

### Types

```ts
type WidgetEventDetail<TOutput = unknown> = {
  name: string;   // registry name on ssv-dynamic-widget
  data: TOutput;  // wrapper’s ssvWidgetOutput detail
};
```

## Passing data from a host

Keep per-widget payloads in one place so new widgets only add a `case`:

```ts
#widgetData(active: "timer" | "count"): unknown {
  switch (active) {
    case "timer":
      return { duration: 30 };
    case "count":
      return {};
    default:
      return {};
  }
}

// render()
<ssv-dynamic-widget name={this.active} data={this.#widgetData(this.active)} />
```

## Context and multiple registries

```
ssv-widget-registry-provider  →  provideContext(WidgetRegistryContext)
        │
        └── ssv-dynamic-widget  →  useContext(WidgetRegistryContext).resolve(name)
```

- **Global:** call `defineWidget(...)` at module scope (no third argument). Any `ssv-dynamic-widget` without an ancestor provider uses `widgetRegistry`.
- **Scoped:** `createWidgetRegistry()`, register with the third `defineWidget` argument, pass `registry` to `ssv-widget-registry-provider`.
- **Empty provider:** omit `registry` on the provider to get a fresh internal registry (useful for tests).

## Build

```bash
pnpm nx run dynamic-widget:build
pnpm nx run dynamic-widget:dev    # watch
```

Outputs: `dist/` (collection + types), `loader/`, `hydrate/` for SSR.

## Examples

Full demo in the monorepo:

- [dynamic-widget demo](../../apps/stencil-playground/src/examples/dynamic-widget/) — `app-dynamic-widget-demo`, timer/count wrappers, scoped registry
- [Vike page](../../apps/vike-playground/src/pages/dynamic-widget/+Page.tsx) — React host around the demo

Registry helpers used by the demo: [widget-definitions.ts](../../apps/stencil-playground/src/examples/dynamic-widget/widget-definitions.ts).

## Related

- [@ssv/stencil.core](../stencil.core/README.md) — `SsvElement`, `useContext`, `provideContext`
- [Stencil component development skill](../../.github/skills/stenciljs-component-development/SKILL.md) — tag prefixes (`ssv-` / `app-`), vertical slices
