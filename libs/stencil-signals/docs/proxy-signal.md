# proxySignal

Wrap a source signal with custom **read** (`get`) and/or **write** (`set`) behavior while keeping the full signal interface (`get`, `peek`, `set`, `update`, `asReadonly`). It is the reusable building block behind [`throttled` / `debounced`](throttled-debounced.md), and useful on its own for projections, unit conversions, validation, or write interception.

**Import:** `@ssv/stencil-signals/extensions`

**Use case:** Expose a derived *view* of a signal that can also be written back (two-way projection), or intercept every write to a signal without replacing it.

> Unlike a JavaScript `Proxy`, this uses the library's idiomatic callable wrapper. The signal surface is small and fully known, so the wrapper is complete and faster. `proxySignal` owns no resources (no timers or listeners), so it needs **no host lifecycle and no `useSignalWatcher()`**.

## Signature

```ts
// Read projection + write interception → writable, projected to R
function proxySignal<T, R>(
  source: WritableSignal<T>,
  handler: { get: (source: Signal<T>) => R; set: (source: WritableSignal<T>, value: R) => void },
  options?: ProxySignalOptions<R>,
): WritableSignal<R>;

// Write interception only → writable, same type (reads pass through)
function proxySignal<T>(
  source: WritableSignal<T>,
  handler: { set: (source: WritableSignal<T>, value: T) => void },
  options?: ProxySignalOptions<T>,
): WritableSignal<T>;

// Read projection only → read-only, projected to R
function proxySignal<T, R>(
  source: Signal<T>,
  handler: { get: (source: Signal<T>) => R },
): Signal<R>;

type ProxySignalHandler<T, R = T> = {
  get?: (source: Signal<T>) => R;
  set?: (source: WritableSignal<T>, value: R) => void;
};

type ProxySignalOptions<R> = {
  /** Equality used to skip no-op writes before calling `set`. Defaults to Object.is. */
  equal?: (a: R, b: R) => boolean;
};
```

| Handler shape       | Source       | Result               |
| ------------------- | ------------ | -------------------- |
| `get` + `set`       | `Writable`   | `WritableSignal<R>`  |
| `set` only          | `Writable`   | `WritableSignal<T>`  |
| `get` only          | any          | `Signal<R>`          |

## Behavior

- **`get`** runs every time the proxy is read (and is tracked, so projected reads stay reactive). Omit it to pass the source value through unchanged.
- **`set`** receives the inner writable source and the incoming (projected) value. It runs inside `untracked`, and is **skipped when `equal(current, value)` is true** — no-op writes never reach the source.
- **`update(fn)`** reads the current projected value untracked, applies `fn`, then routes through `set`.
- **`asReadonly()`** returns a memoized, read-only projection over `source.asReadonly()`.

## Examples

### Read projection (derived view)

```ts
import { signal } from "@ssv/stencil-signals";
import { proxySignal } from "@ssv/stencil-signals/extensions";

const count = signal(2);
const doubled = proxySignal(count, { get: s => s() * 2 });

doubled();        // 4 — reactive: re-reads when count changes
doubled.peek();   // 4 — untracked
// doubled.set    // ❌ read-only (no set handler)
```

### Two-way projection (unit conversion)

```ts
const celsius = signal(0);

const fahrenheit = proxySignal(celsius, {
  get: s => s() * (9 / 5) + 32,
  set: (s, f) => s.set((f - 32) * (5 / 9)),
});

fahrenheit();       // 32
fahrenheit.set(212);
celsius();          // 100
fahrenheit();       // 212
```

### Write interception (set only)

Reads pass straight through; every write runs your hook first:

```ts
const quantity = signal(1);

const clamped = proxySignal(quantity, {
  set: (s, v) => s.set(Math.max(0, Math.min(99, v))),
});

clamped();        // 1 (pass-through read)
clamped.set(500);
quantity();       // 99 — clamped on write
```

## When to use

✓ **Projections / unit conversions** — present a signal in another shape, optionally writable.
✓ **Write interception** — clamp, validate, or log every write without replacing the signal.
✓ **Composing primitives** — the basis for rate-limited writes ([`throttled` / `debounced`](throttled-debounced.md)).

✗ **Pure read-only derivation with no writes** — a plain `computed()` is simpler.
✗ **Async derivation** — use [`derivedAsync`](derived-async.md).
