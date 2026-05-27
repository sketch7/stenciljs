---
name: stenciljs-testing
description: Write and review Vitest tests for Stencil hooks and controllers in this workspace. Use when writing *.spec.ts files, working with TestHost/DomTestHost, using mount/mountDom APIs, testing lifecycle phases, context resolution, or reactive controllers. Trigger words - spec, test, TestHost, mount, mountDom, useEffect, useQuery, useSelector, vitest, lifecycle test, controller test, it.each, afterConnect.
---

# StencilJS Testing

> Full API reference: [libs/stencil-core/docs/testing.md](../../../libs/stencil-core/docs/testing.md)

## Principles

- **One assertion per test** where possible. Split multiple concerns into separate `it` blocks.
- **Name tests as facts**, not procedures: `"returns undefined before first render"`, not `"should return undefined before first render"`.
- **No boilerplate repetition.** If the same setup appears in two tests, use `beforeEach` or a shared helper.
- **Prefer `it.each`** for same-shape, different-input cases — don't write N near-identical `it` blocks.
- **No `let value!: ReturnType<...>` declarations.** Return an object from `mount()` setup instead.

---

## Choosing the right host utility

| Scenario | Tool |
|---|---|
| Hook/controller lifecycle — full lifecycle in one call | `mount()` |
| Assert at a specific lifecycle phase (e.g. pre-connect, pre-render) | `new TestHost()` directly |
| DOM hierarchy, context resolution, event bubbling | `mountDom()` |
| `mountDom` can't be used (e.g. lifecycle expected to throw) | `new DomTestHost()` directly |
| Pure functions / stores — no lifecycle needed | Raw Vitest, no host |

---

## `mount()` — standard pattern

**Always** prefer `mount()` over constructing `TestHost` manually when the full lifecycle (`connect → willLoad → render`) is needed.

Return an object from setup: properties are merged onto the host, typed as `T & TestHost` — no manual type annotations needed.

```ts
import { mount } from "@ssv/stencil-core/testing";

it("exposes data after cache changes", async () => {
  using m = await mount(() => ({
    query: useQuery({ queryKey: ["x"], queryFn: vi.fn<() => unknown>() }, qc),
  }));

  qc.setQueryData(["x"], 42);
  await vi.waitFor(() => expect(m.renderCount).toBeGreaterThan(0));
  expect(m.query().data).toBe(42);
  // m.render(), m.disconnect(), m.renderCount — TestHost methods directly on m
}); // [Symbol.dispose] → disconnect() + clearCurrentHost() — no manual cleanup
```

### Void setup

When no return value is needed, omit the return — result is `TestHost`:

```ts
using host = await mount(() => {
  useEffect(vi.fn());
});
expect(host.renderCount).toBe(1);
```

### `afterConnect` — assert before `willLoad`

Use for assertions that must run between `connect()` and `willLoad()` (e.g. verifying initial pending/loading state before async work starts).

> **Why `afterConnect` and not `afterMount`?** `mount()` internally has an `await` before `willLoad()`. This gives TanStack's microtask-scheduled fetches a chance to run before the assertion. `afterConnect` fires synchronously inside that `await`, before any microtasks execute.

```ts
using m = await mount(
  () => ({ query: useQuery({ queryKey: ["x"], queryFn: () => Promise.resolve("ok") }, qc) }),
  { afterConnect: (mounted) => expect(mounted.query().isLoading).toBeTruthy() },
);
expect(m.query().isLoading).toBeFalsy(); // resolved after willLoad
```

### Hydrated data — add `staleTime: Infinity`

When testing pre-hydrated cache data, add `staleTime: Infinity` to prevent a background refetch from overwriting the assertion:

```ts
using m = await mount(() => ({
  query: useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]), staleTime: Infinity }, target),
}));
expect(m.query().data).toStrictEqual(serverData);
```

### Custom host subclass

Field initializers in the constructor register on the host via `currentHost`. Set query data **before** calling `mount`:

```ts
class ComponentLike extends TestHost {
  readonly query = useQuery({ queryKey: ["sub"], queryFn: vi.fn() }, qc);
}

qc.setQueryData(["sub"], "cached");
using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
expect(comp.query().data).toBe("cached");
```

---

## Error states

When testing hooks that throw or queries that reject, use `mount()` with a try/catch or `expect(...).rejects`, or use `new TestHost()` / `new DomTestHost()` directly when the error occurs during a specific lifecycle phase.

```ts
// Query that rejects
it("sets isError when queryFn rejects", async () => {
  using m = await mount(() => ({
    query: useQuery({ queryKey: ["fail"], queryFn: () => Promise.reject(new Error("oops")), retry: false }, qc),
  }));
  expect(m.query().isError).toBeTruthy();
});

// Hook that throws during lifecycle
it("throws during willLoad", async () => {
  await expect(mount(() => { throw new Error("boom"); })).rejects.toThrow("boom");
});
```

---

## `TestHost` — direct lifecycle control

Use **only** when asserting at a specific phase that `mount()` cannot target: pre-connect, or between connect and render.

```ts
import { TestHost } from "@ssv/stencil-core/testing";

it("setup does NOT run before hostWillLoad", () => {
  using host = new TestHost();
  const setup = vi.fn();
  useLoadEffect(setup);
  host.connect(); // connect only — no willLoad
  expect(setup).not.toHaveBeenCalled();
});
```

`[Symbol.dispose]` fires automatically at block end → `disconnect()` + `dispose()`.

---

## `mountDom()` — DOM hierarchy / context

Use for tests requiring a real `HTMLElement` tree (context resolution, event bubbling, hydration modes).

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

---

## `it.each` — parametrized cases

```ts
it.each([
  { label: "top-down",  mode: "default" as DomTestMode },
  { label: "bottom-up", mode: "hydrate" as DomTestMode },
])("$label: ...", async ({ mode }) => { /* ... */ });

// Simple value table:
it.each([
  [0, "zero"],
  [1, "one"],
])("formats %i as %s", (input, expected) => {
  expect(format(input)).toBe(expected);
});
```

Avoid `it.each` when cases differ in setup or require different assertions — separate `it` blocks are clearer.

---

## Test structure

```ts
describe("FeatureName", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    qc.clear();
  });

  describe("method or scenario", () => {
    it("fact about behaviour", async () => {
      using m = await mount(() => ({ ... }));
      expect(m...).toBe(...);
    });
  });
});
```

- Top-level `describe` = the unit under test.
- Nested `describe` = method, scenario, or lifecycle phase.
- `beforeEach` / `afterEach` at the narrowest applicable scope.
- Don't nest `describe` more than two levels deep.

---

## Lifecycle vs pure logic

| Test target | Approach |
|---|---|
| Hook/controller lifecycle | `mount()` or `new TestHost()` — no Stencil runtime |
| Rendered output, DOM, events | Stencil testing (`@stencil/core/testing`) |
| Pure functions, stores | Raw Vitest — no host at all |

Only use the Stencil test runner when DOM output is the actual assertion target.

---

## Mocks

```ts
vi.mock(import("@stencil/core"), () => ({
  forceUpdate: vi.fn<() => void>(),
}));
```

- Declare `vi.mock(...)` at the top of the file, before imports.
- Type mock functions explicitly: `vi.fn<() => void>()` not `vi.fn()`.
- Call `vi.clearAllMocks()` in `beforeEach`, not `afterEach`.

---

## Anti-patterns

| Avoid | Instead |
|---|---|
| `let query!: ReturnType<typeof useQuery>` | Return `{ query }` from `mount()` setup |
| `new TestHost()` + `host.connect(); await host.willLoad()` | `mount()` |
| `new ComponentLike()` + manual lifecycle | `mount(() => {}, { hostFactory: () => new ComponentLike() })` |
| Inline `TestHost` subclass with more than 5 lines of code in its body | Extract to `<feature>.test-utils.ts` |
| `describe.skip` / `it.skip` as parking lot | Delete or fix |
| Asserting private/internal state | Assert public behaviour only |
| `vi.fn()` without type param | `vi.fn<() => void>()` |
