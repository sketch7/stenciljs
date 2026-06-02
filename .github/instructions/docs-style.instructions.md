---
description: "Use when writing TSDoc, JSDoc, or Markdown documentation (README, API docs, inline comments). Enforces concise, example-first style without implementation detail."
applyTo: "**/*.ts,**/*.md"
---

# Documentation Style

## Principles

- **Short and direct.** One sentence per concept. No filler ("This function...", "Note that...").
- **Examples first.** Lead with a code block; explain only what the example cannot show.
- **No implementation detail.** Document _what_ and _why_, never _how_ internals work.
- **One concern per doc block.** Split multiple scenarios into separate `@example` tags.
- **American English.** Use en-US spelling (e.g. "serialized" not "serialised", "behavior" not "behaviour", visualize not visualise).

## TSDoc / JSDoc

````ts
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
````

- Summary line: one sentence, no trailing period required.
- `@param` / `@returns`: one line each. Skip when the example makes it obvious.
- Multiple `@example` blocks over a single long one.

## Markdown (README / docs)

- Lead section: install + minimal working example — no prose before code.
- **Avoid API tables** for general exports and hook lists. Use a brief description with use-when / avoid-when bullet points instead.
- **Exception:** use a table when it genuinely adds clarity — e.g. a configuration options reference where readers need to scan name, type, default, and description at a glance. If the table is the clearest form, prefer it over forcing bullets.
- Usage snippets: focused and simplified — show only the relevant call site, strip all boilerplate.
- Avoid headers like "Overview", "Introduction", "Background".

### README structure

- Keep the README focused on the package entry point: install, core feature snippets, and links to docs.
- Describe each feature with use-when / avoid-when bullets, then a focused snippet. No prose paragraphs.
- When a feature grows beyond a snippet, extract it into `docs/<feature>.md` and replace the section with a one-line link.
- Each `docs/<feature>.md` covers exactly one concern (e.g. `hooks.md`, `host-context.md`). No mixed topics in one file.
