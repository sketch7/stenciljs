# DOM Observers

Lifecycle-aware wrappers for the native `ResizeObserver`, `IntersectionObserver`, and `MutationObserver` APIs.
All utilities bind automatically to the Stencil component lifecycle when called in a constructor, and work standalone otherwise.

**Import:** `@ssv/stencil-core/observer`

**Example:** [observer](../../apps/stencil-playground/src/examples/ssv-core/observer/), Vike [`+Page.tsx`](../../apps/vike-playground/src/pages/ssv-stencil/core/observers/+Page.tsx).

Observer attaches on `hostConnected`, detaches on `hostDisconnected`, and re-attaches on reconnect.

---

## resizeObserver

Observe element size changes via `ResizeObserver`.

### Single target

Use a getter to defer element access — `@Element()` is `undefined` at field-init time:

```tsx
@Component({ tag: "app-box", shadow: true })
export class AppBox extends SsvElement {
  @Element() el!: HTMLElement;
  @State() width = 0;
  @State() height = 0;

  readonly _ = resizeObserver(
    () => this.el,
    entry => {
      const { width, height } = entry.contentRect;
      this.width = Math.round(width);
      this.height = Math.round(height);
    },
  );
}
```

With a single target the callback receives one `ResizeObserverEntry` directly.

### Multiple targets

Two forms are equivalent — use whichever reads better:

```tsx
// Array getter — one function returning all elements
readonly _ = resizeObserver(
  () => [this.header, this.body],
  entries => { ... },
);

// Array of getters
readonly _ = resizeObserver(
  [() => this.header, () => this.body],
  entries => { ... },
);
```

With multiple targets the callback receives `readonly ResizeObserverEntry[]`.

`null` / `undefined` entries in the array are filtered out, so partially-resolved refs are safe.

### Standalone usage

When called outside a Stencil constructor the caller owns the lifecycle via the returned `destroy()`:

```ts
const ref = resizeObserver(document.querySelector("#panel")!, entry => {
  console.log(entry.contentRect.width);
});

// later...
ref.destroy();
```

### Options

| Option | Description                                         |
| ------ | --------------------------------------------------- |
| `box`  | `ResizeObserverBoxOptions` forwarded to `observe()` |

```tsx
readonly _ = resizeObserver(() => this.el, entry => { ... }, { box: "border-box" });
```

### API

```ts
// Single element or element getter → single entry in callback
resizeObserver(
  target: SingleObserverTarget,
  callback: (entry: ResizeObserverEntry) => void,
  options?: ResizeObserverOptions,
): ObserverRef;

// Array getter or array of targets → entries[] in callback
resizeObserver(
  target: (() => (Element | null | undefined)[]) | ObserverTarget[],
  callback: (entries: readonly ResizeObserverEntry[]) => void,
  options?: ResizeObserverOptions,
): ObserverRef;
```

| Type                    | Definition                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `ObserverTarget`        | `Element \| (() => Element \| null \| undefined) \| (() => (Element \| null \| undefined)[])` |
| `SingleObserverTarget`  | `Element \| (() => Element \| null \| undefined)`                                             |
| `ResizeObserverOptions` | `{ box?: ResizeObserverBoxOptions }`                                                          |
| `ObserverRef`           | `{ destroy(): void }`                                                                         |

---

## intersectionObserver

Observe element intersection with the viewport via `IntersectionObserver`.

### Single target

```tsx
@Component({ tag: "app-box", shadow: true })
export class AppBox extends SsvElement {
  @Element() el!: HTMLElement;
  @State() isVisible = false;
  @State() ratio = 0;

  readonly _ = intersectionObserver(
    () => this.el,
    entry => {
      this.isVisible = entry.isIntersecting;
      this.ratio = entry.intersectionRatio;
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
}
```

With a single target the callback receives one `IntersectionObserverEntry` directly.

### Multiple targets

```tsx
readonly _ = intersectionObserver(
  () => [this.header, this.body],
  entries => { ... },
);
```

### Standalone usage

```ts
const ref = intersectionObserver(document.querySelector("#box")!, entry => {
  console.log(entry.isIntersecting);
});

ref.destroy();
```

### Options

| Option       | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `root`       | Element or document used as the viewport. Defaults to browser viewport. |
| `rootMargin` | Margin around the root (CSS-like values, e.g. `'10px 20px'`).           |
| `threshold`  | Threshold(s) at which the callback fires.                               |

### API

```ts
// Single element or element getter → single entry in callback
intersectionObserver(
  target: SingleObserverTarget,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverOptions,
): ObserverRef;

// Array getter or array of targets → entries[] in callback
intersectionObserver(
  target: (() => (Element | null | undefined)[]) | ObserverTarget[],
  callback: (entries: readonly IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverOptions,
): ObserverRef;
```

| Type                          | Definition                           |
| ----------------------------- | ------------------------------------ |
| `IntersectionObserverOptions` | `{ root?, rootMargin?, threshold? }` |
| `ObserverRef`                 | `{ destroy(): void }`                |

---

## mutationObserver

Observe DOM mutations via `MutationObserver`.

The callback always receives `readonly MutationRecord[]` — even for a single target, multiple records can be batched in one tick (e.g., two attribute changes in the same microtask).

### Single target

```tsx
@Component({ tag: "app-list", shadow: true })
export class AppList extends SsvElement {
  @Element() el!: HTMLElement;
  @State() mutationCount = 0;

  readonly _ = mutationObserver(
    () => this.el,
    records => {
      this.mutationCount += records.length;
    },
    { childList: true, subtree: true },
  );
}
```

### Multiple targets

Two forms are equivalent — use whichever reads better:

```tsx
// Array getter — one function returning all elements
readonly _ = mutationObserver(
  () => [this.header, this.body],
  records => { ... },
  { attributes: true },
);

// Array of getters
readonly _ = mutationObserver(
  [() => this.header, () => this.body],
  records => { ... },
  { childList: true },
);
```

`null` / `undefined` entries in the array are filtered out, so partially-resolved refs are safe.

### Standalone usage

```ts
const ref = mutationObserver(
  document.querySelector("#list")!,
  records => {
    console.log(records);
  },
  { childList: true },
);

// later...
ref.destroy();
```

### Options

| Option                  | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `childList`             | Observe direct child additions and removals.                   |
| `attributes`            | Observe attribute changes.                                     |
| `attributeFilter`       | Limit attribute observation to specific names.                 |
| `attributeOldValue`     | Include previous attribute value in `MutationRecord.oldValue`. |
| `characterData`         | Observe text content changes.                                  |
| `characterDataOldValue` | Include previous text value in `MutationRecord.oldValue`.      |
| `subtree`               | Extend observation to all descendants.                         |

```tsx
readonly _ = mutationObserver(() => this.el, records => { ... }, { childList: true, attributes: true, subtree: true });
```

### API

```ts
mutationObserver(
  target: ObserverTarget | ObserverTarget[],
  callback: (records: readonly MutationRecord[]) => void,
  options?: MutationObserverOptions,
): ObserverRef;
```

| Type                      | Definition                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ObserverTarget`          | `Element \| (() => Element \| null \| undefined) \| (() => (Element \| null \| undefined)[])`                         |
| `MutationObserverOptions` | `{ childList?, attributes?, attributeFilter?, attributeOldValue?, characterData?, characterDataOldValue?, subtree? }` |
| `ObserverRef`             | `{ destroy(): void }`                                                                                                 |

---

## SSR

When `ResizeObserver`, `IntersectionObserver`, or `MutationObserver` is not available in the environment (SSR / Node.js) the call is a no-op and `destroy()` is safe to call.
