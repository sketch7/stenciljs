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

All lifecycle hooks are optional — implement only what you need.

```ts
// mouse-controller.ts
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

class MouseController implements ReactiveController {
  pos = { x: 0, y: 0 };
  readonly onMouseMove = ({ clientX, clientY }: MouseEvent) => {
    this.pos = { x: clientX, y: clientY };
    this.host.requestUpdate(); // triggers re-render
  };

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected() { window.addEventListener("mousemove", this.onMouseMove); }
  hostDisconnected() { window.removeEventListener("mousemove", this.onMouseMove); }
}

export function useMouseController(host: ReactiveControllerHost) {
  return new MouseController(host);
}
```

Available hooks: `hostConnected`, `hostDisconnected`, `hostWillLoad`, `hostDidLoad`, `hostWillRender`, `hostDidRender`, `hostWillUpdate`, `hostDidUpdate`.

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

@Component({ tag: "ssv-timer-host", shadow: true })
export class SsvTimerHost extends Mixin(SsvElementMixin) {
  private timer = useTimerController(this, 1000);
}
```

## Examples

See [apps/stencil-playground/src/mouse-host/](../../apps/stencil-playground/src/mouse-host/) and [apps/stencil-playground/src/timer-host/](../../apps/stencil-playground/src/timer-host/) for full working examples.
