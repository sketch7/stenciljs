---
name: stenciljs-component-development
description: StencilJS component patterns for this workspace. Use when creating new Stencil components, adding reactive state with @stencil/store, implementing ReactiveController from @ssv/stencil.core, or working with output targets. Trigger words - component, stencil, @Component, store, reactive controller, SsvElement, output target, web component.
---

# StencilJS Component Development

## Creating a New Component

Follow the [vertical slice conventions](../../instructions/conventions.instructions.md) — one folder per feature.

```
src/
  <feature>/
    <feature>.tsx          # @Component
    <feature>.css          # scoped styles
    <feature>.store.ts     # optional: co-located @stencil/store state
    <feature>-controller.ts  # optional: ReactiveController
```

**Minimal template (lib):**

```typescript
import { Component, h } from "@stencil/core";

@Component({
  tag: "ssv-<feature>",   // "app-<feature>" inside apps/
  styleUrl: "<feature>.css",
  shadow: true,
})
export class Ssv<Feature> {
  render() {
    return <div>…</div>;
  }
}
```

Export from `src/index.ts` (named exports only — no default exports in libs):

```typescript
export { Ssv<Feature> } from "./<feature>/<feature>";
```

## State: @stencil/store

For shared or persistent state, co-locate a store file in the feature folder.

```typescript
// <feature>/<feature>.store.ts
import { createStore } from "@stencil/store";

const { state } = createStore({ count: 0 });
export const counterStore = state;
```

Mirror store values to `@State` inside the component to trigger re-renders when mutating the store:

```typescript
import { Component, State, h } from "@stencil/core";
import { counterStore } from "./counter.store";

export class AppCounter {
  @State() count = counterStore.count;

  private increment() {
    counterStore.count++;
    this.count = counterStore.count; // sync to @State to trigger render
  }
}
```

See: [apps/stencil-playground/src/counter/](../../../apps/stencil-playground/src/counter/)

## Reactive Controllers (@ssv/stencil.core)

Use `ReactiveController` for lifecycle-aware, reusable behaviour (event listeners, intervals, subscriptions). The controller calls `host.requestUpdate()` to trigger re-renders.

### 1. Implement the controller

```typescript
// <feature>/<feature>-controller.ts
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

class FeatureController implements ReactiveController {
  private host: ReactiveControllerHost;
  value = …;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this); // registers with the host lifecycle
  }

  hostConnected() { /* setup: add listeners, start timers */ }
  hostDisconnected() { /* cleanup: remove listeners, clear timers */ }
}

export function useFeatureController(host: ReactiveControllerHost): FeatureController {
  return new FeatureController(host);
}
```

### 2. Host the controller in the component

Extend `SsvElement` (single inheritance) or `Mixin(SsvElementMixin)` (when extending another class):

```typescript
// Option A — single inheritance
import { SsvElement } from "@ssv/stencil.core";

export class AppMouseHost extends SsvElement {
  private mouse = useMouseController(this);
  render() { return <div>{this.mouse.pos.x}</div>; }
}

// Option B — mixin (when you need to extend another base class)
import { SsvElementMixin } from "@ssv/stencil.core";
import { Mixin } from "@stencil/core";

export class AppTimerHost extends Mixin(SsvElementMixin) {
  private timer = withTimerController(this, 1000);
}
```

See:

- Mouse tracking example: [apps/stencil-playground/src/mouse-host/](../../../apps/stencil-playground/src/mouse-host/)
- Timer example: [apps/stencil-playground/src/timer-host/](../../../apps/stencil-playground/src/timer-host/)
- Library source: [libs/stenciljs.core/src/](../../../libs/stenciljs.core/src/)

## Output Targets (stencil.config.ts)

When a Stencil app needs to generate framework wrappers, configure `outputTargets` in `stencil.config.ts`:

```typescript
import { reactOutputTarget } from "@stencil/react-output-target";

outputTargets: [
  reactOutputTarget({ outDir: "src/react", hydrateModule: "<pkg>/hydrate" }),
  { type: "dist", esmLoaderPath: "../loader" },
  { type: "dist-custom-elements", externalRuntime: false },
  { type: "dist-hydrate-script", dir: "../hydrate" },
];
```

React wrappers are auto-generated to `src/react/` on each Stencil build. Consumers import them as:

```typescript
import { AppCounter } from "@app/stencil-playground/react";
```

See: [apps/stencil-playground/stencil.config.ts](../../../apps/stencil-playground/stencil.config.ts)

## Quick Reference

| Pattern                                     | Example Files                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Component + @stencil/store                  | [counter/](../../../apps/stencil-playground/src/counter/)                     |
| Component + ReactiveController (SsvElement) | [mouse-host/](../../../apps/stencil-playground/src/mouse-host/)               |
| Component + ReactiveController (Mixin)      | [timer-host/](../../../apps/stencil-playground/src/timer-host/)               |
| Output targets config                       | [stencil.config.ts](../../../apps/stencil-playground/stencil.config.ts)       |
| Core library API                            | [libs/stenciljs.core/src/index.ts](../../../libs/stenciljs.core/src/index.ts) |
