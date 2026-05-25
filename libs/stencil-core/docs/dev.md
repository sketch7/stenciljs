# Dev Utilities

Development-only helpers for debugging Stencil components. Import from `@ssv/stencil-core/dev` — never ship in production bundles.

```ts
import { useLifecycleLogger } from "@ssv/stencil-core/dev";
```

## API

| Export               | Kind | Purpose                                                            |
| -------------------- | ---- | ------------------------------------------------------------------ |
| `useLifecycleLogger` | fn   | Logs all lifecycle hooks to the console; accumulates `HookEvent[]` |
| `HookEvent`          | type | `{ hook: HookName; ts: string; index: number }`                    |
| `HookName`           | type | Union of all eight Stencil lifecycle hook names                    |

## `useLifecycleLogger`

Registers a controller that fires a `console.warn` on every lifecycle hook and keeps a read-only log of events.

```ts
import { SsvElement } from "@ssv/stencil-core";
import { useLifecycleLogger } from "@ssv/stencil-core/dev";
import { Component, h } from "@stencil/core";

@Component({ tag: "app-demo", shadow: true })
export class AppDemo extends SsvElement {
  readonly #lifecycle = useLifecycleLogger();

  render() {
    return <pre>{JSON.stringify(this.#lifecycle.events, null, 2)}</pre>;
  }
}
```

### Value API

| Member   | Kind   | Purpose                                         |
| -------- | ------ | ----------------------------------------------- |
| `events` | getter | `readonly HookEvent[]` — all events since mount |
| `clear`  | method | Empties the log and requests a re-render        |

### Console output

Each hook fires a styled `console.warn`:

```
[lifecycle] hostConnected  { index: 1, ts: "12:34:56.789" }
[lifecycle] hostWillLoad   { index: 2, ts: "12:34:56.790" }
[lifecycle] hostDidLoad    { index: 3, ts: "12:34:56.820" }
```

Each hook name is color-coded for quick visual scanning.
