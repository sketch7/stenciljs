# throttled & debounced

Rate-limited signals. **`throttled`** lets a value through at most once per interval (leading + trailing edge); **`debounced`** waits for a quiet window before letting the latest value through (trailing edge). Both share the same two shapes and are built on [`proxySignal`](proxy-signal.md).

**Import:** `@ssv/stencil-signals/extensions`

**Use case:** Debounce a search box before querying; throttle a scroll/resize/pointer-driven signal; smooth out a chatty external source.

## Signatures

```ts
// Source overload → read-only signal that MIRRORS the source, rate-limited
function throttled<T>(
  source: Signal<T>,
  timeMs: number,
  options?: RateLimitedOptions<T>,
): RateLimitedSignal<T>;
function debounced<T>(
  source: Signal<T>,
  timeMs: number,
  options?: RateLimitedOptions<T>,
): RateLimitedSignal<T>;

// Value overload → WRITABLE signal: reads are immediate, set()/update() are rate-limited
function throttled<T>(
  value: T,
  timeMs: number,
  options?: RateLimitedOptions<T>,
): RateLimitedWritableSignal<T>;
function debounced<T>(
  value: T,
  timeMs: number,
  options?: RateLimitedOptions<T>,
): RateLimitedWritableSignal<T>;

type RateLimitedOptions<T> = { equals?: (a: T, b: T) => boolean };
type RateLimitedSignal<T> = Signal<T> & { dispose(): void };
type RateLimitedWritableSignal<T> = WritableSignal<T> & { dispose(): void };
```

| Overload | First arg          | Returns                 | Behavior                                                                    |
| -------- | ------------------ | ----------------------- | --------------------------------------------------------------------------- |
| Source   | an existing signal | read-only `+ dispose()` | Mirrors the source, but the mirror only updates on the rate-limit schedule  |
| Value    | a plain value      | writable `+ dispose()`  | Reads return the current value immediately; `set`/`update` are rate-limited |

`timeMs` is a fixed number of milliseconds.

## Edge semantics

- **`throttled`** — leading **and** trailing. The first change in an idle window applies immediately; further changes within `timeMs` are coalesced and the last one is flushed when the window elapses.
- **`debounced`** — trailing only. Each change resets the timer; the latest value applies once `timeMs` passes with no further change.

## Source overload — rate-limit a mirror

Keep your own signal updating instantly, and derive a rate-limited copy for expensive work:

```ts
import { signal } from "@ssv/stencil-signals";
import { debounced } from "@ssv/stencil-signals/extensions";

const query = signal("");
const debouncedQuery = debounced(query, 300);

// `query` updates on every keystroke (instant);
// `debouncedQuery` settles 300ms after typing stops.
effect([debouncedQuery], ([q]) => search(q));
```

## Value overload — a signal whose writes lag

The returned signal is writable; its visible value changes on the rate-limit schedule:

```ts
import { throttled } from "@ssv/stencil-signals/extensions";

const position = throttled(0, 100); // writable
window.addEventListener("scroll", () => position.set(window.scrollY));
// position() updates at most every 100ms
```

## Lifecycle

The internal timer (and, for the source overload, an internal `effect`) is cleaned up automatically when used as a host class field — the timer is cancelled on `disconnectedCallback`.

Like [`effect`](effect.md) and [`derivedAsync`](derived-async.md), the **source overload** installs an effect, so it must be declared **after** `useSignalWatcher()`:

```ts
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { debounced } from "@ssv/stencil-signals/extensions";
import { Component, h } from "@stencil/core";

@Component({ tag: "app-search", shadow: true })
export class AppSearch extends SsvElement {
  readonly signalWatcher = useSignalWatcher(); // 1 — first
  readonly text = signal("");                  // local input state
  readonly debouncedText = debounced(this.text, 300); // 2 — after the watcher

  render() {
    const results = filter(this.debouncedText());
    return (
      <div>
        <input value={this.text()} onInput={e => this.text.set((e.target as HTMLInputElement).value)} />
        <ul>{results.map(r => <li key={r.id}>{r.label}</li>)}</ul>
      </div>
    );
  }
}
```

**Standalone (no host):** call `dispose()` yourself when done — it cancels any pending timer and stops the internal effect:

```ts
const d = debounced(source, 300);
// ...later
d.dispose();
```

## When to use

✓ **Debounced search / autocomplete** — `debounced(query, 300)` before querying.
✓ **Throttled high-frequency input** — scroll, resize, pointer move, drag.
✓ **Taming a chatty source** — smooth a signal that updates faster than you can render.

✗ **You need the value immediately** — read the original signal; only the rate-limited mirror lags.
✗ **Async work with abort-on-change** — use [`derivedAsync`](derived-async.md).
