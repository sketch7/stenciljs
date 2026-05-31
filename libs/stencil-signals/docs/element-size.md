# elementSize

Signal containing the measured dimensions of an element, updated via `ResizeObserver`.

**Import:** `@ssv/stencil-signals/extensions`

**Prerequisites:** `useSignalWatcher()` declared **before** this field ([signal-watcher.md](signal-watcher.md)).

Attaches a `ResizeObserver` on `hostConnected`, detaches on `hostDisconnected`, and resets the signal to `initialValue` on disconnect.

## Usage

```tsx
import { elementSize } from "@ssv/stencil-signals/extensions";

@Component({ tag: "app-box", shadow: true })
export class AppBox extends SsvElement {
  @Element() el!: HTMLElement;

  readonly signalWatcher = useSignalWatcher();
  readonly size = elementSize(() => this.el);

  render() {
    const { width, height } = this.size();
    return <div>{width} × {height}</div>;
  }
}
```

Before the first measurement, `size()` returns `{ width: 0, height: 0 }`.

## Box model

Default is `'border-box'`. Use `'content-box'` to exclude padding and border:

```ts
readonly size = elementSize(() => this.el, { box: "content-box" });
```

| Option         | Type                       | Default                  | Description                                          |
| -------------- | -------------------------- | ------------------------ | ---------------------------------------------------- |
| `box`          | `ResizeObserverBoxOptions` | `'border-box'`           | Which box to observe                                 |
| `initialValue` | `ElementSizeValue`         | `{ width: 0, height: 0 }` | Value before first measurement and after disconnect |

## API

| Export             | Kind      | Description                                                  |
| ------------------ | --------- | ------------------------------------------------------------ |
| `elementSize()`    | function  | Creates a read-only `Signal<ElementSizeValue>`               |
| `ElementSizeValue` | type      | `{ readonly width: number; readonly height: number }`        |
| `ElementSizeOptions` | type    | Options bag for `elementSize()`                              |
