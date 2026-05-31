# intersect

Signal containing the latest `IntersectionObserverEntry` for an element, updated via `IntersectionObserver`.

**Import:** `@ssv/stencil-signals/extensions`

**Prerequisites:** `useSignalWatcher()` declared **before** this field ([signal-watcher.md](signal-watcher.md)).

Attaches an `IntersectionObserver` on `hostConnected`, detaches on `hostDisconnected`, and resets the signal to `initialValue` on disconnect.

## Usage

```tsx
import { intersect } from "@ssv/stencil-signals/extensions";

@Component({ tag: "app-box", shadow: true })
export class AppBox extends SsvElement {
  @Element() el!: HTMLElement;

  readonly signalWatcher = useSignalWatcher();
  readonly $intersect = intersect(() => this.el);
  readonly isVisible = computed(() => this.$intersect()?.isIntersecting ?? false);

  render() {
    return <div class={{ visible: this.isVisible() }}>...</div>;
  }
}
```

Before the first observation, `$intersect()` returns `undefined`.

## Threshold

```ts
readonly $intersect = intersect(() => this.el, { threshold: [0, 0.5, 1] });
```

## Scoped viewport

```ts
readonly $intersect = intersect(() => this.el, {
  root: this.scrollContainerEl,
  rootMargin: "0px 0px -100px 0px",
});
```

## Options

| Option         | Type                             | Default     | Description                                          |
| -------------- | -------------------------------- | ----------- | ---------------------------------------------------- |
| `root`         | `Element \| Document \| null`    | `null`      | Viewport element; `null` = browser viewport          |
| `rootMargin`   | `string`                         | `'0px'`     | CSS-like margin around root                          |
| `threshold`    | `number \| number[]`             | `0`         | Ratio(s) at which to fire                            |
| `initialValue` | `IntersectionObserverEntry`      | `undefined` | Value before first observation and after disconnect  |

## API

| Export            | Kind     | Description                                                    |
| ----------------- | -------- | -------------------------------------------------------------- |
| `intersect()`     | function | Creates a read-only `Signal<IntersectionObserverEntry \| undefined>` |
| `IntersectOptions` | type    | Options bag for `intersect()`                                  |
