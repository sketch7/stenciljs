# Hooks

`use(factory)` is the core primitive for registering a `ReactiveController` from inside a field initializer.

## API

| Export                        | Kind     | Purpose                                                                                          |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `use`                         | fn       | Registers a controller; factory form returns the hook's public value                             |
| `ReactiveController`          | type     | Controller interface with optional lifecycle hooks                                               |
| `ReactiveControllerHost`      | type     | Host API — `addController`, `requestUpdate`                                                      |
| `ReactiveControllerHostMixin` | mixin fn | Adds controller support to any Stencil component class                                           |
| `getCurrentHost`              | fn       | _(low-level)_ Returns the host currently being constructed; throws outside a constructor context |

## Forms

| Form                                      | Returns                                 | When to use                              |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `use((host) => ({ hooks, value }))`       | `Omit<value, keyof ReactiveController>` | Hook exposes state — typo-safe lifecycle |
| `use((host) => ({ hostConnected, ... }))` | `void`                                  | Side-effects only, simpler syntax        |
| `use(controller)`                         | `void`                                  | Pre-built controller object              |

> When using the `hooks` key, TypeScript's excess-property check catches lifecycle typos (e.g. `hostDisconnectedX`) at compile time.

## Inline closure — preferred when exposing state

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

## Side-effects only — return `ReactiveController` directly

When the hook manages its own return value (e.g. returns a selector function), return a plain `ReactiveController` from the factory instead of the `{ hooks, value }` wrapper.

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

## Class — when you need private fields or methods

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

## Hosting a controller

### `SsvElement` — single inheritance

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

### `SsvElementMixin` — mixin composition

Use when you need to extend another base class alongside the mixin.

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

## Host context (`getCurrentHost`)

`getCurrentHost()` is a low-level primitive used internally by `use()`. You only need it when building a hook primitive that requires the host reference outside a `use()` factory.

`ReactiveControllerHostMixin` constructors call `setCurrentHost(this)` and queue `clearCurrentHost()` as a microtask. Both are internal — not part of the public API. Any `use()` call during field initialization reads the active host via `getCurrentHost()`.

```ts
import { getCurrentHost } from "@ssv/stencil.core";

export function useMyHook() {
  const host = getCurrentHost(); // host available during field initialization
  // ... register directly, no use() wrapper needed
}
```
