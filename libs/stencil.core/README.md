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

## Usage

### 1. Implement a controller

Two styles are supported. Prefer **fn-only** — it is simpler and avoids a class.

All lifecycle hooks are optional — implement only what you need.
Available hooks: `hostConnected`, `hostDisconnected`, `hostWillLoad`, `hostDidLoad`, `hostWillRender`, `hostDidRender`, `hostWillUpdate`, `hostDidUpdate`.

#### Style A — fn-only ✅ preferred

State lives in the closure. An object literal satisfies the `ReactiveController` interface.

```ts
// mouse-controller.ts
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

export function useMouseController(host: ReactiveControllerHost): { pos: { x: number; y: number } } {
  let pos = { x: 0, y: 0 };
  const onMouseMove = ({ clientX, clientY }: MouseEvent) => {
    pos = { x: clientX, y: clientY };
    host.requestUpdate();
  };
  const ctrl: ReactiveController = {
    hostConnected() { globalThis.addEventListener("mousemove", onMouseMove); },
    hostDisconnected() { globalThis.removeEventListener("mousemove", onMouseMove); },
  };
  host.addController(ctrl);
  return {
    get pos() { return pos; },
  };
}
```

#### Style B — class (use when you need methods or private fields)

The class constructor calls `host.addController(this)` to self-register. Expose it via a `use*` factory function.

```ts
// timer-controller.ts
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

class TimerController implements ReactiveController {
  #elapsed = 0;
  #intervalId: ReturnType<typeof setInterval> | undefined;
  get elapsed() { return this.#elapsed; }

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly intervalMs = 1000,
  ) {
    host.addController(this);
  }

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

export function useTimerController(host: ReactiveControllerHost, intervalMs?: number): TimerController {
  return new TimerController(host, intervalMs);
}
```

### 2. Host the controller — `SsvElement` (single inheritance)

```ts
import { SsvElement } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";
import { useMouseController } from "./mouse-controller";

@Component({ tag: "ssv-mouse-host", shadow: true })
export class SsvMouseHost extends SsvElement {
  private mouse = useMouseController(this);

  render() {
    return <div>x: {this.mouse.pos.x}, y: {this.mouse.pos.y}</div>;
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
  private timer = useTimerController(this, 1000);

  render() {
    return <div>{this.timer.elapsed}ms</div>;
  }
}
```

## Examples

See [apps/stencil-playground/src/examples/ssv-core/mouse-host/](../../apps/stencil-playground/src/examples/ssv-core/mouse-host/) and [apps/stencil-playground/src/examples/ssv-core/timer-host/](../../apps/stencil-playground/src/examples/ssv-core/timer-host/) for full working examples.
