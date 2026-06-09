# @ssv/stencil-ui

[![license](https://img.shields.io/npm/l/@ssv/stencil-ui.svg)](LICENSE)

```bash
pnpm add @ssv/stencil-ui @ssv/stencil-core
```

**Peer deps:** `@stencil/core >=4.0.0`, `@ssv/stencil-core`

## Compose system

`ssv-compose` resolves a registry name to a component tag and renders it — normalizing all output events into a single `composeEvent`.

- Use for config-driven / CMS UIs where the rendered component is determined at runtime
- Use for dashboard panels with pluggable widget slots — the host owns the registry, panels stay decoupled
- Use for feature flags or A/B variants — swap the tag behind a name without changing template markup
- Avoid when the set of rendered components is fixed at compile time — just use them directly

```ts
import {
  createCompositionDefs,
  provideCompositionRegistry,
} from "@ssv/stencil-ui/compose";
```

### Minimal example

```ts
// compose-defs.ts
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
    return (
      <ssv-compose
        name="timer"
        props={{ duration: 30 }}
        onComposeEvent={e => console.log(e.detail)}
      />
    );
  }
}
```

---

## Composition modes

### Direct mode — use an existing component as-is

- Use when `props` shape matches the component's props and you want all custom events forwarded automatically
- `props` are spread directly; every `CustomEvent` is re-emitted as `composeEvent` with the original `eventName`

```ts
const defs = createCompositionDefs({
  counter: { tag: "app-signals-counter" },
});
// e.detail → { name: "counter", eventName: "myCustomEvent", data: <event detail> }
```

Add `mapProps` when the incoming `props` shape differs from the component's prop signature:

```ts
timer: {
  tag: "app-timer",
  mapProps: (p: { duration: number }) => ({ duration: p.duration, autoStart: true }),
},
```

Add `mapOutputs` to selectively capture events instead of forwarding everything:

```ts
timer: {
  tag: "app-timer",
  mapOutputs: {
    isRunningChange: (e: CustomEvent<boolean>) => ({ isRunning: e.detail }),
  },
},
// emits: { name: "timer", data: { isRunning: true } }
```

### Wrapper mode — encapsulate mapping in a component

- Use when mapping logic is complex, you need to compose multiple children, or you want full type safety on `props`
- Extend `ComposeWidget`; `ssv-compose` passes `props` as a single typed prop instead of spreading

```tsx
@Component({ tag: "app-timer-widget", shadow: false })
export class AppTimerWidget extends ComposeWidget {
  @Prop() props!: { duration: number; autoStart?: boolean };
  @Event() ssvComposeOutput!: EventEmitter<{ elapsed: number }>;

  render() {
    return (
      <app-timer
        duration={this.props.duration}
        autoStart={this.props.autoStart ?? false}
        onElapsed={(e: CustomEvent<number>) => this.ssvComposeOutput.emit({ elapsed: e.detail })}
      />
    );
  }
}
```

```ts
const defs = createCompositionDefs({ timer: { tag: "app-timer-widget" } });
// ssv-compose passes { props: { duration: 30 } }
// ssvComposeOutput is re-emitted as composeEvent: { name: "timer", data: { elapsed: 5 } }
```

---

## Registry

### Scoped registry (recommended)

Call `provideCompositionRegistry` as a class field — all `ssv-compose` descendants resolve from this registry:

```tsx
// accepts a defs map directly, or a fluent setup function
readonly composeRegistry = provideCompositionRegistry(defs);
readonly composeRegistry = provideCompositionRegistry(r =>
  r.register("timer", { tag: "app-timer-widget" })
   .register("table", { tag: "app-data-table" }),
);
```

Multiple independent subtrees can each have their own scoped registry.

### Programmatic registration

```ts
const registry = createComposeRegistry();
registry.register("timer", { tag: "app-timer-widget" });
registry.registerFromDefs(defs); // bulk
```

**Duplicate policy: last wins.** Re-registering a key overwrites silently in production, warns in development.

---

## `ComposeEventDetail`

Every event emitted by `ssv-compose`:

```ts
type ComposeEventDetail<TOutput = unknown> = {
  name: string;       // the name prop on ssv-compose
  eventName?: string; // set in direct mode — the original DOM event name
  data: TOutput;      // payload from ssvComposeOutput, mapOutputs, or direct event detail
};
```

---

## Aliases

Aliases let consumers use stable strings while the underlying tag can change:

```ts
const defs = createCompositionDefs({
  timer: { tag: "app-timer-widget", aliases: ["countdown", "kitchen-timer"] },
});
export type WidgetName = CompositionNameOf<typeof defs>;
// "timer" | "countdown" | "kitchen-timer"
```

---

## Error slot

Unknown names render the `error` slot instead of throwing:

```tsx
<ssv-compose name="missing">
  <span slot="error">Widget not found</span>
</ssv-compose>
```

---

## Multiple registries

Nest providers to scope the registry to a sub-tree without affecting siblings:

```
AppRoot
├── AppDashboard  provideCompositionRegistry(dashboardDefs)
│   └── ssv-compose name="timer"  → dashboardDefs ✓
└── AppSidebar  provideCompositionRegistry(sidebarDefs)
    └── ssv-compose name="nav"    → sidebarDefs ✓
```

---

## Typed props helper pattern

```ts
#props(active: WidgetName): unknown {
  switch (active) {
    case "timer":
    case "countdown":
      return { duration: 30 };
    case "table":
      return { rows: this.rows };
    default:
      return {};
  }
}
```

---

## Examples

- [compose demo](../../apps/stencil-playground/src/examples/compose/) — typed defs, scoped registry, alias resolution, event log
- [Vike page](../../apps/vike-playground/src/pages/compose/+Page.tsx) — React host consuming the demo

## Related

- [@ssv/stencil-core](../stencil-core/README.md) — `SsvElement`, `useContext`, `provideContext`
