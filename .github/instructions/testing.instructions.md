---
description: "Use when writing or reviewing Vitest unit/integration tests (*.spec.ts). Enforces it.each for parametrized cases, shared test-host utilities, and separation of Stencil lifecycle tests from pure logic tests."
applyTo: "**/*.spec.ts"
---

# Testing

> For API patterns, examples, and host-utility selection, load the **`stenciljs-testing` skill**.

## Rules

- **One assertion per test** where possible.
- **Name tests as facts**, not procedures: `"returns undefined before first render"`, not `"should return undefined"`.
- **Prefer `it.each`** for same-shape, different-input cases. Avoid `it.each` when cases differ in setup or assertions.
- **No `let value!: ReturnType<...>` declarations** — return an object from `mount()` setup instead.
- **No boilerplate repetition** — extract to `beforeEach` or a `<feature>.test-utils.ts` co-located with the spec.
- **Feature-specific utils only** — no shared utils across unrelated features.

## Host utility selection

| Test target                          | Tool                                              |
| ------------------------------------ | ------------------------------------------------- |
| Hook/controller — full lifecycle     | `mount()` from `@ssv/stencil-core/testing`        |
| Assert at a specific lifecycle phase | `new TestHost()` directly                         |
| DOM hierarchy, context resolution    | `mountDom()` from `@ssv/stencil-core/testing/dom` |
| Pure functions / stores              | Raw Vitest — no host                              |
| Rendered output, DOM, events         | `@stencil/core/testing`                           |

## Structure

- Top-level `describe` = the unit under test.
- Nested `describe` = method, scenario, or lifecycle phase. Max two levels deep.
- `beforeEach` / `afterEach` at the narrowest applicable scope.

## Mocks

- Declare `vi.mock(...)` at the top of the file, before imports.
- Type mock functions explicitly: `vi.fn<() => void>()` not `vi.fn()`.
- Call `vi.clearAllMocks()` in `beforeEach`, not `afterEach`.

## What to avoid

- Don't write a `TestHost` subclass inline in a spec — extract to a util file if more than 5 lines.
- Don't assert implementation details (internal state, private methods).
- Don't use `describe.skip` or `it.skip` as a parking lot — delete or fix.
