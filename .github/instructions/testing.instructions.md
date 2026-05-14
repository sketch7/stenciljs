---
description: "Use when writing or reviewing Vitest unit/integration tests (*.spec.ts). Enforces it.each for parametrized cases, shared test-host utilities, and separation of Stencil lifecycle tests from pure logic tests."
applyTo: "**/*.spec.ts"
---

# Testing

## Principles

- **One assertion per test** where possible. Split multiple concerns into separate `it` blocks.
- **No boilerplate repetition.** If the same setup appears in two tests, extract a helper or use `beforeEach`.
- **Prefer `it.each` for same-shape, different-input cases.** Don't write N identical `it` blocks that differ only in params.
- **Name tests as facts**, not procedures: `"returns undefined before first render"`, not `"should return undefined before first render"`.

## `it.each` — parametrized cases

Use when multiple inputs map to the same assertion shape:

```ts
it.each([
  [0, "zero"],
  [1, "one"],
  [-1, "negative one"],
])("formats %i as %s", (input, expected) => {
  expect(format(input)).toBe(expected);
});
```

Use `it.each` with an object array when labels add clarity:

```ts
it.each([
  { label: "no selector", state: 42, expected: 42 },
  { label: "selector", state: { count: 5 }, expected: 5 },
])("$label: returns $expected", ({ state, expected }) => {
  // ...
});
```

Avoid `it.each` when cases differ in setup or require different assertions — separate `it` blocks are clearer.

## Test utilities — avoid boilerplate, keep it simple

### `TestHost` from `@ssv/stencil.core/testing`

Use the shared `TestHost` from `@ssv/stencil.core/testing` — do **not** redefine it inline.
It simulates the Stencil component lifecycle (render, requestUpdate, disconnect) without the runtime.

```ts
import { clearCurrentHost, TestHost } from "@ssv/stencil.core/testing";

let host: TestHost;
beforeEach(() => {
  host = new TestHost();
});
afterEach(() => {
  clearCurrentHost();
});
```

`TestHost` exposes: `controllers`, `renderCount`, `render()`, `requestUpdate()`, `disconnect()`.

### Feature-specific utilities

When a spec needs test helpers beyond `TestHost`, extract them into a `<feature>.test-utils.ts` co-located with the spec.

Rules:

- Prefix util files with the feature they support, not `test-` globally.
- Utils expose the minimal surface the spec actually needs — don't add methods speculatively.
- No shared utils across unrelated features. Duplication between unrelated specs is fine.

## Structure

```ts
describe("FeatureName", () => {
  // shared setup
  let host: TestHost;
  beforeEach(() => {
    host = new TestHost();
  });
  afterEach(() => {
    clearCurrentHost();
  });

  describe("method or scenario", () => {
    it("fact about behaviour", () => {
      /* ... */
    });
  });
});
```

- Top-level `describe` = the unit under test (class, function, or hook name).
- Nested `describe` = a method, scenario, or lifecycle phase.
- `beforeEach` / `afterEach` at the narrowest scope that applies.

## Stencil lifecycle vs pure logic

| Test target                                                         | Approach                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| Hook/controller lifecycle (`hostConnected`, `hostWillRender`, etc.) | Raw Vitest + `TestHost` utility — no Stencil runtime |
| Rendered output, DOM, events, props/attrs                           | Stencil testing (`@stencil/core/testing`)            |
| Pure functions and stores                                           | Raw Vitest, no host at all                           |

Prefer raw Vitest + `TestHost` over the Stencil test runner when the assertion is about controller behaviour rather than rendered output. Stencil's test runner adds overhead and requires a browser-like environment — only pay that cost when the DOM is actually involved.

## Mocks

- Declare `vi.mock(...)` at the top of the file, before imports.
- Type mock functions explicitly: `vi.fn<() => void>()` not `vi.fn()`.
- Call `vi.clearAllMocks()` in `beforeEach`, not `afterEach`, so failures show uncleaned state.

```ts
vi.mock(import("@stencil/core"), () => ({
  forceUpdate: vi.fn<() => void>(),
}));
```

## What to avoid

- Don't write a `TestHost` class inline inside a spec — put it in a util file if it's more than 5 lines.
- Don't assert implementation details (internal state, private methods).
- Don't use `describe.skip` or `it.skip` as a parking lot — delete or fix.
- Don't nest `describe` more than two levels deep.
