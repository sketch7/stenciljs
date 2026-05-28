---
name: stenciljs-component-development
description: StencilJS component patterns for this workspace. Use when creating new Stencil components, adding reactive state with @stencil/store or @ssv/tanstack.stencil-store, implementing ReactiveController from @ssv/stencil-core, or working with output targets. Trigger words - component, stencil, @Component, store, reactive controller, SsvElement, output target, web component, useSelector, useAtom, tanstack.
---

# StencilJS Component Development

## Creating a New Component

Follow the [vertical slice conventions](../../instructions/conventions.instructions.md) — one folder per feature.

```
src/
  <feature>/
    <feature>.tsx          # @Component
    <feature>.css          # scoped styles
    <feature>.store.ts     # optional: co-located @stencil/store state
    <feature>-controller.ts  # optional: ReactiveController
```

**Minimal template (lib):**

```typescript
import { Component, h } from "@stencil/core";

@Component({
  tag: "ssv-<feature>",   // "app-<feature>" inside apps/
  styleUrl: "<feature>.css",
  shadow: true,
})
export class Ssv<Feature> {
  render() {
    return <div>…</div>;
  }
}
```

Export from `src/index.ts` (named exports only — no default exports in libs):

```typescript
export { Ssv<Feature> } from "./<feature>/<feature>";
```

## State: @stencil/store

For shared or persistent state, co-locate a store file in the feature folder.

```typescript
// <feature>/<feature>.store.ts
import { createStore } from "@stencil/store";

const { state } = createStore({ count: 0 });
export const counterStore = state;
```

Mirror store values to `@State` inside the component to trigger re-renders when mutating the store:

```typescript
import { Component, State, h } from "@stencil/core";
import { counterStore } from "./counter.store";

export class AppCounter {
  @State() count = counterStore.count;

  private increment() {
    counterStore.count++;
    this.count = counterStore.count; // sync to @State to trigger render
  }
}
```

See: [apps/stencil-playground/src/examples/stencil-store/counter/](../../../apps/stencil-playground/src/examples/stencil-store/counter/)

## Reactive Controllers (@ssv/stencil-core)

Use `ReactiveController` for lifecycle-aware, reusable behaviour (event listeners, intervals, subscriptions). The controller calls `host.requestUpdate()` to trigger re-renders.

Use `use(factory)` from `@ssv/stencil-core` — the factory receives `host` and returns `{ hooks: ReactiveController; value? }`. The `hooks` object is registered as the controller; `value` is returned to the caller with lifecycle methods stripped from its type. Omit `value` for side-effect-only hooks.

> The `hooks` key is typed as the exact `ReactiveController` interface, so lifecycle method typos (e.g. `hostDisconnectedX`) are caught at compile time.

### Controller styles

Two styles are supported. Prefer **inline** — it is simpler and avoids a class.

#### Inline (closure) ✅ preferred

State lives in the closure. Return `{ hooks, value }` from the factory.

```typescript
// <feature>/<feature>-controller.ts
import { use } from "@ssv/stencil-core";

export function useMouseController() {
  return use((host) => {
    let pos = { x: 0, y: 0 };
    const onMouseMove = ({ clientX, clientY }: MouseEvent) => {
      pos = { x: clientX, y: clientY };
      host.requestUpdate();
    };
    return {
      hooks: {
        hostConnected() { globalThis.addEventListener("mousemove", onMouseMove); },
        hostDisconnected() { globalThis.removeEventListener("mousemove", onMouseMove); },
      },
      value: { get pos() { return pos; } },
    };
  });
}
// Inferred return type: { pos: { x: number; y: number } }
```

See: [ssv-core/mouse-host/mouse-controller.ts](../../../apps/stencil-playground/src/examples/ssv-core/mouse-host/mouse-controller.ts)

#### Class — when you need methods or private fields

The class constructor must **not** call `addController` — `use()` handles registration.
Expose it via a factory function so consumers use the same `use*` call-site convention.

```typescript
// <feature>/<feature>-controller.ts
import { use } from "@ssv/stencil-core";
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil-core";

class TimerController implements ReactiveController {
  #elapsed = 0;
  #intervalId: ReturnType<typeof setInterval> | undefined;
  get elapsed() { return this.#elapsed; }

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly intervalMs = 1000,
  ) {} // ← no addController here; use() handles registration

  hostConnected() {
    this.#elapsed = 0;
    this.#intervalId = setInterval(() => {
      this.#elapsed += this.intervalMs;
      this.host.requestUpdate();
    }, this.intervalMs);
  }

  hostDisconnected() {
    if (this.#intervalId !== undefined) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
  }
}

export function useTimerController(intervalMs?: number) {
  return use((host) => {
    const timer = new TimerController(host, intervalMs);
    return { hooks: timer, value: timer };
  });
}
// Inferred return type: { elapsed: number }  (lifecycle methods stripped)
```

See: [ssv-core/timer-host/timer-controller.ts](../../../apps/stencil-playground/src/examples/ssv-core/timer-host/timer-controller.ts)

### Host the controller in the component

Extend `SsvElement` (single inheritance) or `Mixin(SsvElementMixin)` (when extending another base class).
Hooks are called in class field initializers — no `this` passed, no `host` parameter needed.

```typescript
// Option A — single inheritance
import { SsvElement } from "@ssv/stencil-core";

export class AppMouseHost extends SsvElement {
  #mouse = useMouseController();
  render() { return <div>{this.#mouse.pos.x}</div>; }
}

// Option B — mixin (when you need to extend another base class)
import { SsvElementMixin } from "@ssv/stencil-core";
import { Mixin } from "@stencil/core";

export class AppTimerHost extends Mixin(SsvElementMixin) {
  #timer = useTimerController(1000);
  render() { return <div>{this.#timer.elapsed}ms</div>; }
}
```

See:

- Mouse tracking example: [apps/stencil-playground/src/examples/ssv-core/mouse-host/](../../../apps/stencil-playground/src/examples/ssv-core/mouse-host/)
- Timer example: [apps/stencil-playground/src/examples/ssv-core/timer-host/](../../../apps/stencil-playground/src/examples/ssv-core/timer-host/)
- Library source: [libs/stencil-core/src/](../../../libs/stencil-core/src/)

## Output Targets (stencil.config.ts)

When a Stencil app needs to generate framework wrappers, configure `outputTargets` in `stencil.config.ts`:

```typescript
import { reactOutputTarget } from "@stencil/react-output-target";

outputTargets: [
  reactOutputTarget({ outDir: "src/react", hydrateModule: "<pkg>/hydrate" }),
  { type: "dist", esmLoaderPath: "../loader" },
  { type: "dist-custom-elements", externalRuntime: false },
  { type: "dist-hydrate-script", dir: "../hydrate" },
];
```

React wrappers are auto-generated to `src/react/` on each Stencil build. Consumers import them as:

```typescript
import { AppCounter } from "@app/stencil-playground/react";
```

See: [apps/stencil-playground/stencil.config.ts](../../../apps/stencil-playground/stencil.config.ts)

## Side-effect Hooks (`this.setup()`)

Some hooks register controllers for lifecycle side-effects only — their return value is never read. TypeScript class bodies require every expression to be assigned, so use `this.setup()` instead of proliferating `_xxx` fields.

Two forms:

```ts
// callback — group multiple hooks, statement syntax inside
readonly _ = this.setup(() => {
  provideQueryClient({ client: new QueryClient() });
  useQueryDevtools({ enabled: true });
});

// spread — single hook, terse
readonly _ = this.setup(useQueryDevtools());
```

**Rules:**
- Always `readonly _` — the `void` type signals "don't read this value"
- Use callback form when grouping 2+ hooks or when order matters (e.g. `provideQueryClient` before `useQueryDevtools`)
- Use spread form for a single standalone hook

**Never do:**

```ts
// ❌ unnamed, non-readonly — easy to miss, inconsistent
_ = useQueryDevtools();

// ❌ separate named fields for each side-effect hook
readonly _devtools = useQueryDevtools();
readonly _watcher = useSignalWatcher();
```

See: [ts-query/posts/posts.tsx](../../../apps/stencil-playground/src/examples/ts-query/posts/posts.tsx), [ts-query/prefetch/prefetch-demo.tsx](../../../apps/stencil-playground/src/examples/ts-query/prefetch/prefetch-demo.tsx)

## Quick Reference

| Pattern                                     | Example Files                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Component + @stencil/store                  | [stencil-store/counter/](../../../apps/stencil-playground/src/examples/stencil-store/counter/)     |
| Component + @ssv/tanstack.stencil-store      | [ts-store/counter/](../../../apps/stencil-playground/src/examples/ts-store/counter/)               |
| Component + ReactiveController (SsvElement) | [ssv-core/mouse-host/](../../../apps/stencil-playground/src/examples/ssv-core/mouse-host/)         |
| Component + ReactiveController (Mixin)      | [ssv-core/timer-host/](../../../apps/stencil-playground/src/examples/ssv-core/timer-host/)         |
| Side-effect hooks (`this.setup()`)          | [ts-query/posts/posts.tsx](../../../apps/stencil-playground/src/examples/ts-query/posts/posts.tsx) |
| Component + TanStack Query                  | [ts-query/posts/](../../../apps/stencil-playground/src/examples/ts-query/posts/)                   |
| Output targets config                       | [stencil.config.ts](../../../apps/stencil-playground/stencil.config.ts)                            |
| Core library API                            | [libs/stencil-core/src/index.ts](../../../libs/stencil-core/src/index.ts)                          |

## TanStack Query (@ssv/tanstack.stencil-query)

`useQuery` and `useMutation` return a `Ref<T>` — a callable function that reads the live observer result on each call.

### Wrapper hook pattern (preferred for components)

Use getter properties to absorb the `()` call so the component accesses plain property paths:

```ts
// posts.api.ts
import { useQuery, useMutation } from "@ssv/tanstack.stencil-query";

export function usePosts() {
  const postsRef = useQuery(() => ({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    staleTime: 5 * 60 * 1000,
  }));

  const createRef = useMutation({
    mutationFn: (title: string) => apiCreatePost(title),
    onSuccess: () => client.current?.invalidateQueries({ queryKey: ["posts"] }),
  });

  return {
    get posts() { return postsRef(); },   // getter absorbs ()
    get create() { return createRef(); }, // getter absorbs ()
  };
}
```

```ts
// posts.tsx — no () at call sites; plain property access throughout
export class AppPosts extends SsvElement {
  readonly #api = usePosts();

  render() {
    const { data, isPending, isError } = this.#api.posts;
    return <button onClick={() => this.#api.create.mutate("New post")}>Add</button>;
  }
}
```

### Direct use (hooks or tests)

When using `useQuery`/`useMutation` directly, invoke the ref:

```ts
readonly #posts = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });

render() {
  const { data, isPending } = this.#posts(); // () reads live result
}
```

### Type aliases

| Type               | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `UseQueryRef<T>`   | `Ref<UseQueryResult<T>>` — return type of `useQuery`   |
| `UseMutationRef<T,E,V>` | `Ref<UseMutationResult<T,E,V>>` — return type of `useMutation` |

See [libs/tanstack.stencil-query/README.md](../../../libs/tanstack.stencil-query/README.md) for the full API.
