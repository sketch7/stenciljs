---
description: "Use when writing TSDoc, JSDoc, or Markdown documentation (README, API docs, inline comments). Enforces concise, example-first style without implementation detail."
applyTo: "**/*.ts,**/*.md"
---

# Documentation Style

## Principles

- **Short and direct.** One sentence per concept. No filler ("This function...", "Note that...").
- **Examples first.** Lead with a code block; explain only what the example cannot show.
- **No implementation detail.** Document *what* and *why*, never *how* internals work.
- **One concern per doc block.** Split multiple scenarios into separate `@example` tags.

## TSDoc / JSDoc

```ts
// ✅ Good — concise summary, example-first
/**
 * Selects a slice of state and schedules a re-render when it changes.
 *
 * @example
 * ```ts
 * readonly #count = useSelector(this, () => counterStore, (s) => s.count);
 * ```
 */
export function useSelector(...) {}

// ❌ Bad — verbose, explains internals
/**
 * This function creates a ReactiveController and registers it with the host.
 * It subscribes to the store returned by getStore on each render cycle and
 * calls host.requestUpdate() when the selected value changes...
 */
```

- Summary line: one sentence, no trailing period required.
- `@param` / `@returns`: one line each. Skip when the example makes it obvious.
- Multiple `@example` blocks over a single long one.

## Markdown (README / docs)

- Lead section: install + minimal working example — no prose before code.
- API tables: name | kind | one-line purpose. No sentences.
- Examples: show the call site only; omit surrounding boilerplate unless critical.
- Avoid headers like "Overview", "Introduction", "Background".
