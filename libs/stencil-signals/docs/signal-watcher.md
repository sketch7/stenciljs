# Signal Watcher

Auto-tracks signal reads during `render()` and re-renders the component whenever a tracked signal changes.

Two integration patterns:

|                              | `Mixin(SignalWatcherMixin, SsvElementMixin)` | `SsvElement` + `useSignalWatcher()`  |
| ---------------------------- | -------------------------------------------- | ------------------------------------ |
| Inheritance                  | Mixin chain                                  | Single base class                    |
| API collisions               | Possible                                     | None                                 |
| Extra boilerplate            | None                                         | None (`SsvElement` already provided) |
| Works with other controllers | Via `Mixin()`                                | Via `addController()`                |
| Multiple controllers         | `Mixin(A, B, C)`                             | `addController(a); addController(b)` |

## `SignalWatcherMixin`

**Direct extension** (no other mixins, or Stencil < 4.37):

```tsx
@Component({ tag: "my-comp", shadow: true })
export class MyComp extends SignalWatcher(class {}) {
  render() {
    return <p>{mySignal()}</p>;
  }
}
```

**`Mixin()` composition** (Stencil v4.37+, when combining with other mixins):

```tsx
import { Component, Mixin } from "@stencil/core";
import { SignalWatcherMixin } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";
import { LoggingMixin } from "./mixins/logging-mixin";

@Component({ tag: "my-comp", shadow: true })
export class MyComp extends Mixin(
  SignalWatcherMixin,
  LoggingMixin,
  SsvElementMixin,
) {
  componentDidLoad() {
    super.componentDidLoad?.();
  }

  render() {
    return <p>{mySignal()}</p>;
  }
}
```

Put `SignalWatcherMixin` first in `Mixin()` so it wraps the outermost `render()`.

## `SignalWatcherController` (composition alternative)

Extend `SsvElement` and use `useSignalWatcher()` as a class-property initializer:

```tsx
import { Component } from "@stencil/core";
import { useSignalWatcher } from "@ssv/stencil-signals";
import { SsvElement } from "@ssv/stencil.core";
import { count, doubled } from "./store";

@Component({ tag: "my-counter", shadow: false })
export class MyCounter extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  render() {
    return (
      <div>
        <p>
          {count()} (doubled: {doubled()})
        </p>
        <button onClick={() => count.update(n => n + 1)}>+1</button>
      </div>
    );
  }
}
```

## Owner scope and auto-disposal

When the component connects, `SignalWatcherController` activates a shared owner scope for one microtask. Any `effect` or `derivedAsync` created during that window registers its dispose function automatically. On disconnect, all registered cleanups flush in one pass.

`effect` and `derivedAsync` used as **class fields** start on `hostConnected`, snapshot state on `hostDisconnected`, and recreate on reconnect. **Declare `useSignalWatcher()` before any such field.**

```tsx
readonly signalWatcher = useSignalWatcher();

readonly _titleEff = effect(() => {
  document.title = `Count: ${count()}`;
});

readonly $props = useSignalProps(MyComp)({ count: {} });
```

`computedPrevious` is a plain derived signal and does not need this ordering.

## How re-rendering works

`SignalWatcherController` (installed by both patterns):

- Wraps `render()` in a persistent `Computed` that tracks all signal reads as dependencies
- Arms a `Watcher` that calls `requestUpdate()` whenever any tracked signal changes
- Bumps a version signal each `hostWillRender` so prop/state-triggered renders also execute correctly
- Disposes the watcher on `disconnectedCallback`
