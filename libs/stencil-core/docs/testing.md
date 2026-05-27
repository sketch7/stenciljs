# Testing utilities

Lifecycle-aware test hosts for unit-testing hooks and controllers without the Stencil runtime.

## API

| Export        | Import path                     | Kind  | Purpose                                                                          |
| ------------- | ------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `TestHost`    | `@ssv/stencil-core/testing`     | class | Minimal host simulating the Stencil component lifecycle                          |
| `mount`       | `@ssv/stencil-core/testing`     | fn    | Full lifecycle setup (`connect → willLoad → render`); `using`-compatible         |
| `DomTestHost` | `@ssv/stencil-core/testing/dom` | class | `HTMLElement`-based host for tests requiring real DOM hierarchy / event bubbling |
| `mountDom`    | `@ssv/stencil-core/testing/dom` | fn    | Builds a hierarchical DOM tree, connects all nodes, and runs `willLoad` on all   |

## `mount` — full lifecycle in one call

Return an object from setup — its properties are merged onto the host and inferred as `T & TestHost`.
No `let value!: ReturnType<...>` declarations needed.

```ts
import { mount } from "@ssv/stencil-core/testing";

it("exposes new data when cache changes", async () => {
  using m = await mount(() => ({
    query: useQuery({ queryKey: ["x"], queryFn: vi.fn<() => unknown>() }, qc),
  }));

  qc.setQueryData(["x"], 42);
  await vi.waitFor(() => expect(m.renderCount).toBeGreaterThan(0));
  expect(m.query().data).toBe(42);
  // m.renderCount, m.render(), m.disconnect() — TestHost methods directly on m
}); // [Symbol.dispose] → disconnect() + clearCurrentHost()
```

`mount` runs `connect → willLoad → render`, then returns the merged result.
`[Symbol.dispose]` calls `disconnect()` then `dispose()` — no manual cleanup needed.

### Void setup

When no return value is needed, omit the return — the result is typed as `TestHost`:

```ts
using host = await mount((h) => {
  useEffect(vi.fn());
});
expect(host.renderCount).toBe(1);
```

### `afterConnect` — assert before `willLoad`

Use `afterConnect` for assertions that must run between `connect()` and `willLoad()` (e.g. checking an initial loading state before async work begins):

```ts
using m = await mount(
  () => ({ query: useQuery({ queryKey: ["x"], queryFn: () => Promise.resolve("ok") }, qc) }),
  { afterConnect: (mounted) => expect(mounted.query().isLoading).toBeTruthy() },
);
expect(m.query().isLoading).toBeFalsy(); // resolved after willLoad
```

### Custom host subclass

Field initializers in the subclass constructor register on the host via `currentHost`:

```ts
class ComponentLike extends TestHost {
  readonly query = useQuery({ queryKey: ["sub"], queryFn: vi.fn() }, qc);
}

using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
expect(comp.query().isPending).toBe(true);
```

## `TestHost` — direct lifecycle control

Use `new TestHost()` when a test needs to assert behavior at a specific lifecycle phase:

```ts
import { TestHost } from "@ssv/stencil-core/testing";

it("setup does NOT run before hostWillLoad", () => {
  using host = new TestHost();
  const setup = vi.fn();
  useLoadEffect(setup);
  host.connect(); // only connect — no willLoad
  expect(setup).not.toHaveBeenCalled();
});

it("cleanup runs on disconnect", () => {
  using host = new TestHost();
  const cleanup = vi.fn();
  useEffect(() => cleanup);
  host.render();
  host.disconnect(); // explicit disconnect for assertion
  expect(cleanup).toHaveBeenCalledOnce();
  // [Symbol.dispose] fires at end of block — second disconnect is a no-op
});
```

## `mountDom` — provider/consumer pair

Supports `"default"` (top-down, parent first) and `"hydrate"` (bottom-up, deepest first + sets `s-id`) modes:

```ts
import { mountDom } from "@ssv/stencil-core/testing/dom";
import type { DomTestMode } from "@ssv/stencil-core/testing/dom";

it.each([
  { label: "top-down",  mode: "default" as DomTestMode },
  { label: "bottom-up", mode: "hydrate" as DomTestMode },
])("$label: consumer resolves provider context", async ({ mode }) => {
  let ref!: ContextRef<{ id: number }>;
  using tree = await mountDom(n => {
    provideContext(Ctx, { id: 42 });
    n.child(() => { ref = useContext(Ctx); });
  }, { mode });
  expect(ref.current).toStrictEqual({ id: 42 });
}); // auto: disconnect all + DOM removal
```

## `mountDom` — deep tree

Arbitrary nesting; each `child()` call creates a new `DomTestHost` in the DOM:

```ts
// tree:  root (provider) → child1 (consumer) → [gc1, gc2]
//                        → child2 (consumer)
let ref1!: ContextRef<{ id: number }>;
using tree = await mountDom(root => {
  provideContext(Ctx, { id: 99 });

  root.child(c1 => {
    ref1 = useContext(Ctx);
    c1.child(() => { /* grandchild 1 */ });
    c1.child(() => { /* grandchild 2 */ });
  });

  root.child(() => { /* child2 setup */ });
});
expect(ref1.current).toStrictEqual({ id: 99 });
```

## `mountDom` — siblings sharing a singleton context

Use an empty root as a container; siblings see no provider ancestor and fall back to the singleton:

```ts
let r1!: ContextRef<{ id: number }>, r2!: ContextRef<{ id: number }>;
using tree = await mountDom(root => {
  root.child(() => { r1 = useContext(WithDefaultCtx); });
  root.child(() => { r2 = useContext(WithDefaultCtx); });
});
expect(r1.current).toBe(r2.current); // same singleton instance
```

## `DomTestHost` — manual control for error scenarios

Use `new DomTestHost()` directly when `mountDom` cannot be used (e.g., when the lifecycle is expected to throw):

```ts
import { DomTestHost } from "@ssv/stencil-core/testing/dom";

it("throws when no provider exists", async () => {
  using host = new DomTestHost(); // [Symbol.dispose] → disconnect + remove + clearCurrentHost
  useContext(NoDefaultCtx);
  document.body.append(host);
  host.connect();
  await expect(host.willLoad()).rejects.toThrow("[ssv:context]");
});
```
