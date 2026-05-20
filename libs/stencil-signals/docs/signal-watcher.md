# Signal Watcher

Auto-tracks signal reads during `render()` and re-renders the component whenever a tracked signal changes.

**Prerequisites:** extend [`SsvElement`](../../stencil.core/README.md) (or apply `SsvElementMixin`) and register the adapter in `globalScript` ([README](../README.md#installation)).

**Examples:** [counter](../../apps/stencil-playground/src/examples/stencil-signals/counter/), [todo](../../apps/stencil-playground/src/examples/stencil-signals/todo/).

## Integration patterns

|                     | `Mixin(SignalWatcherMixin, SsvElementMixin)` | `SsvElement` + `useSignalWatcher()` |
| ------------------- | -------------------------------------------- | ----------------------------------- |
| Inheritance         | Mixin chain                                  | Single base class                   |
| API collisions      | Possible with other mixins                   | None                                |
| Other controllers   | Via `Mixin()`                                | Via `use()` / `addController()`     |
| Recommended default | When mixin stack is required                 | **Yes** for new components          |

## `useSignalWatcher()` (recommended)

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
        <button type="button" onClick={() => count.update(n => n + 1)}>
          +1
        </button>
      </div>
    );
  }
}
```

## `SignalWatcherMixin`

**Direct extension** (no other mixins, or Stencil before 4.37):

```tsx
@Component({ tag: "my-comp", shadow: true })
export class MyComp extends SignalWatcher(class {}) {
  render() {
    return <p>{mySignal()}</p>;
  }
}
```

**`Mixin()` composition** (Stencil v4.37+, multiple mixins):

```tsx
import { Component, Mixin } from "@stencil/core";
import { SignalWatcherMixin } from "@ssv/stencil-signals";
import { SsvElementMixin } from "@ssv/stencil.core";

@Component({ tag: "my-comp", shadow: true })
export class MyComp extends Mixin(SignalWatcherMixin, SsvElementMixin) {
  componentDidLoad() {
    super.componentDidLoad?.();
  }

  render() {
    return <p>{mySignal()}</p>;
  }
}
```

Put `SignalWatcherMixin` **first** in `Mixin()` so it wraps the outermost `render()`.

## Owner scope and auto-disposal

On `hostConnected`, `SignalWatcherController` opens an active-owner list for one microtask. `effect`, `derivedAsync`, `useSignalProps`, and `signalFromEvent` register dispose functions there. On `hostDisconnected`, all registered cleanups run.

Host-bound class fields also snapshot state on disconnect and recreate on reconnect. **Declare `useSignalWatcher()` before any such field.**

```tsx
readonly signalWatcher = useSignalWatcher();

readonly _titleEff = effect(() => {
  document.title = `Count: ${count()}`;
});

readonly $props = useSignalProps(MyComp)({ count: {} });
```

`computedPrevious` and module-level `computed()` do not require this ordering.

## How re-rendering works

`SignalWatcherController`:

- Wraps `render()` in a persistent computed that tracks signal reads
- Arms a watcher that schedules `requestUpdate()` when the computed becomes dirty
- Bumps a version signal on each `hostWillRender` so prop/`@State` updates still re-run JSX even when no signal changed
- Disposes the watcher on disconnect (deferred microtask so DOM moves in the same task do not leak)
