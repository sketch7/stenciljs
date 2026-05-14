# @ssv/stencil.core

Core utilities for hosting lifecycle-aware controllers in [StencilJS](https://stenciljs.com/) components.

## Install

```bash
pnpm add @ssv/stencil.core
```

**Peer dependency:** `@stencil/core >=4`

## API

| Export                        | Kind     | Purpose                                                               |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `ReactiveController`          | type     | Controller interface — implement lifecycle hooks                      |
| `ReactiveControllerHost`      | type     | Host API passed to controllers (`addController`, `requestUpdate`)     |
| `ReactiveControllerHostMixin` | mixin fn | Adds controller support to any Stencil component class                |
| `SsvElement`                  | class    | Convenience base class (extends `Mixin(ReactiveControllerHostMixin)`) |
| `SsvElementMixin`             | mixin    | Same as above but composable via Stencil's `Mixin()`                  |
| `use`                         | fn       | Registers a controller; factory form returns the hook's public value  |

## Usage

### 1. Implement a hook

`use(factory)` is the core primitive. Three factory forms are supported:

| Form                                      | Returns                                 | When to use                              |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `use((host) => ({ hooks, value }))`       | `Omit<value, keyof ReactiveController>` | Hook exposes state — typo-safe lifecycle |
| `use((host) => ({ hostConnected, ... }))` | `void`                                  | Side-effects only, simpler syntax        |
| `use(controller)`                         | `void`                                  | Pre-built controller object              |

> When using the `hooks` key, TypeScript's excess-property check catches lifecycle typos (e.g. `hostDisconnectedX`) at compile time.

#### Inline (closure) — preferred when exposing state

```ts
// mouse-controller.ts
import { use } from "@ssv/stencil.core";

export function useMouseController() {
  return use(host => {
    let pos = { x: 0, y: 0 };
    const onMouseMove = ({ clientX, clientY }: MouseEvent) => {
      pos = { x: clientX, y: clientY };
      host.requestUpdate();
    };
    return {
      hooks: {
        hostConnected() {
          globalThis.addEventListener("mousemove", onMouseMove);
        },
        hostDisconnected() {
          globalThis.removeEventListener("mousemove", onMouseMove);
        },
      },
      value: {
        get pos() {
          return pos;
        },
      },
    };
  });
}
// Inferred return type: { pos: { x: number; y: number } }
```

#### Side-effects only — return `ReactiveController` directly

When the hook manages its own return value (e.g. returns a selector function), return a plain
`ReactiveController` from the factory instead of the `{ hooks, value }` wrapper.

```ts
export function useResizeObserver(
  onResize: (entry: ResizeObserverEntry) => void,
) {
  let observer: ResizeObserver | undefined;

  use(host => ({
    hostConnected() {
      observer = new ResizeObserver(([entry]) => {
        onResize(entry);
        host.requestUpdate();
      });
      observer.observe(host as unknown as Element);
    },
    hostDisconnected() {
      observer?.disconnect();
      observer = undefined;
    },
  }));
}
```

#### Class — when you need private fields or methods

The class constructor must **not** call `addController` — `use()` handles registration.

```ts
// timer-controller.ts
import { use } from "@ssv/stencil.core";
import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@ssv/stencil.core";

class TimerController implements ReactiveController {
  #elapsed = 0;
  #intervalId: ReturnType<typeof setInterval> | undefined;
  get elapsed() {
    return this.#elapsed;
  }

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly intervalMs = 1000,
  ) {} // ← no addController here

  hostConnected() {
    this.#elapsed = 0;
    this.#intervalId = setInterval(() => {
      this.#elapsed += this.intervalMs;
      this.host.requestUpdate();
    }, this.intervalMs);
  }

  hostDisconnected() {
    if (this.#intervalId !== undefined) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
  }
}

export function useTimerController(intervalMs?: number) {
  return use(host => {
    const timer = new TimerController(host, intervalMs);
    return { hooks: timer, value: timer };
  });
}
// Inferred return type: { elapsed: number }  (lifecycle methods stripped)
```

### 2. Host the controller — `SsvElement` (single inheritance)

```ts
import { SsvElement } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";
import { useMouseController } from "./mouse-controller";

@Component({ tag: "ssv-mouse-host", shadow: true })
export class SsvMouseHost extends SsvElement {
  #mouse = useMouseController();

  render() {
    return <div>x: {this.#mouse.pos.x}, y: {this.#mouse.pos.y}</div>;
  }
}
```

### 3. Host the controller — `SsvElementMixin` (mixin composition)

Use this when you need to extend another base class alongside the mixin.

```ts
import { SsvElementMixin } from "@ssv/stencil.core";
import { Component, Mixin, h } from "@stencil/core";
import { useTimerController } from "./timer-controller";

@Component({ tag: "ssv-timer-host", shadow: true })
export class SsvTimerHost extends Mixin(SsvElementMixin) {
  #timer = useTimerController(1000);

  render() {
    return <div>{this.#timer.elapsed}ms</div>;
  }
}
```

## Examples

See [apps/stencil-playground/src/examples/ssv-core/mouse-host/](../../apps/stencil-playground/src/examples/ssv-core/mouse-host/) and [apps/stencil-playground/src/examples/ssv-core/timer-host/](../../apps/stencil-playground/src/examples/ssv-core/timer-host/) for full working examples.
