# @ssv/stencil-signals

Signals-based reactive state for [StencilJS](https://stenciljs.com/) — auto-tracking `render()`, lifecycle-bound effects, and Stencil-native prop/event bridges. Ships with a **TC39** backend (`signal-polyfill`) and a **Preact Signals** backend (`@preact/signals-core`).

## When to adopt

- Shared UI state across many Stencil components (design tokens, shell chrome, feature flags)
- Derived values that should not be recomputed on every `render()` pass
- Replacing `@Watch` + lifecycle boilerplate for prop-driven side effects
- Async data with abort-on-change semantics (`derivedAsync`)
- Teams standardising on TC39 Signals or already using Preact Signals elsewhere

## Install

```bash
pnpm add @ssv/stencil-signals @ssv/stencil-core
# pick one backend:
pnpm add signal-polyfill        # TC39 (recommended)
pnpm add @preact/signals-core   # Preact Signals
```

**Peers:** `@stencil/core >=4` (4.43+ recommended), `@ssv/stencil-core`, exactly one backend.

## Activation (one-time)

Register exactly one adapter in a [global script](https://stenciljs.com/docs/config#globalscript) before any component code runs:

```ts
// src/global.ts
import "@ssv/stencil-signals/tc39"; // or "@ssv/stencil-signals/preact"
export default function globalScript() {}
```

```ts
// stencil.config.ts
export const config: Config = { globalScript: "src/global.ts" };
```

> [!IMPORTANT]
> Mixing `/tc39` and `/preact` in the same bundle is unsupported.

## Quick start

**Shared state** (module scope):

```ts
// counter.store.ts
import { computed, signal } from "@ssv/stencil-signals";

export const count = signal(0);
export const doubled = computed(() => count() * 2);
```

**Component** — `useSignalWatcher()` enables auto-tracking in `render()`, always declare first:

```tsx
import { SsvElement } from "@ssv/stencil-core";
import { useSignalWatcher } from "@ssv/stencil-signals";
import { count, doubled } from "./counter.store";

@Component({ tag: "ssv-counter", shadow: true })
export class SsvCounter extends SsvElement {
  readonly _watcher = useSignalWatcher();

  render() {
    return (
      <div>
        {count()} — doubled: {doubled()}
        <button onClick={() => count.update(n => n + 1)}>+1</button>
      </div>
    );
  }
}
```

When composing mixins, use `SignalWatcherMixin` with `Mixin()` and place it first — see [signal-watcher.md](docs/signal-watcher.md).

## Lifecycle-bound effects — `effect`

- Use for side effects tied to signal changes (DOM mutations, analytics, subscriptions)
- Avoid for plain connect/disconnect logic — prefer `useEffect(fn, [])` from `@ssv/stencil-core`

```ts
// auto-tracking form — re-runs when any read signal changes
readonly _sync = effect(() => {
  document.title = `Count: ${count()}`;
});

// explicit deps form — defer: true skips the initial run
readonly _log = effect([count], () => {
  console.log("count changed:", count());
}, { defer: true });
```

→ [effect.md](docs/effect.md) — `effectOnceIf`, cleanup, ordering

## Async derived state — `derivedAsync`

- Use for async data (fetches, timers) that should abort when signal deps change
- Provides `initialValue`, `whenSettled`, and an abort signal for fetch cancellation

```ts
readonly user = derivedAsync(async ({ signal }) => {
  const id = this.#userId();
  return fetch(`/api/users/${id}`, { signal }).then(r => r.json());
}, { initialValue: null });
```

→ [derived-async.md](docs/derived-async.md)

## Prop bridge — `useSignalProps`

- Use to replace `@Watch` + manual state sync for `@Prop`-driven reactivity
- Import from `@ssv/stencil-signals/extensions`; requires `useSignalWatcher()` declared first

```ts
readonly $props = useSignalProps(SsvTimer)({
  isRunning: { twoWay: true },
  duration: {},
});
// this.$props.isRunning() reads the current prop as a signal
```

→ [signal-props.md](docs/signal-props.md) — `transform`, `required`, two-way `@Event()` codegen

## Signal store — `signalStore`

Feature-sliced stores with `withState`, `withComputed`, `withMethods`. Import from `@ssv/stencil-signals/store`.

```ts
// todo.store.ts
export const TodoStore = signalStore(
  withState({ items: [] as Todo[], filter: "all" as Filter }),
  withComputed(({ items, filter }) => ({
    filtered: computed(() => items().filter(matchesFilter(filter()))),
  })),
  withMethods(({ items }) => ({
    add: (text: string) => patchState(items, [...items(), { text, done: false }]),
  })),
);
```

→ [signal-store.md](docs/signal-store.md) — `patchState`, `withConfig`, reusable features

## Other features

- [signal-from-event.md](docs/signal-from-event.md) — DOM/window events as signals (`signalFromEvent`)
- [proxy-signal.md](docs/proxy-signal.md) — two-way projections and write interception
- [throttled-debounced.md](docs/throttled-debounced.md) — rate-limited signals
- [element-size.md](docs/element-size.md) — `ResizeObserver`-backed dimensions signal
- [intersect.md](docs/intersect.md) — `IntersectionObserver`-backed signal
- [effect-once-if.md](docs/effect-once-if.md) — run an effect exactly once when a condition becomes true

## Entry points

- `@ssv/stencil-signals` — `signal`, `computed`, `batch`, `untracked`, `useSignalWatcher`, `effect`, `derivedAsync`, `computedPrevious`
- `@ssv/stencil-signals/extensions` — `useSignalProps`, `signalFromEvent`, `elementSize`, `intersect`, `throttled`, `debounced`
- `@ssv/stencil-signals/store` — `signalStore`, `withState`, `withComputed`, `withMethods`, `patchState`
- `@ssv/stencil-signals/tc39` / `/preact` — adapter activation (global script only)

## Examples

Full working examples: [counter](../../apps/stencil-playground/src/examples/stencil-signals/counter/), [todo + signalStore](../../apps/stencil-playground/src/examples/stencil-signals/todo/), [timer + useSignalProps](../../apps/stencil-playground/src/examples/stencil-signals/timer/), [derivedAsync](../../apps/stencil-playground/src/examples/stencil-signals/derived-async/), [mouse event](../../apps/stencil-playground/src/examples/stencil-signals/mouse-event/).
