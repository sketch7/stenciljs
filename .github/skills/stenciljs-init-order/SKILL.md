---
name: stenciljs-init-order
description: Reference for Stencil component initialization order across rendering modes (SSR, client navigation, and hydration). Use when writing code that depends on parent-child initialization sequence, context resolution, `hostConnected` or `hostWillLoad` timing, or `globalThis`/`window` availability in Stencil components. Trigger words — initialization order, hydration, SSR init, hostConnected order, context timing, window in SSR, globalThis, bottom-up, top-down. Do not use for general component authoring, output-target configuration, or non-Stencil frameworks.
---

# Stencil Component Initialization Order

Stencil does **not** guarantee a consistent initialization order across rendering modes.
Code that depends on parent–child sequencing must account for all three modes below.

## Initialization Modes

| Mode | Order | Notes |
| ---- | ----- | ----- |
| **SSR** (server render) | top-down: `host → shell → profile` | `globalThis` / `window` available (hydrate runtime provides a mock) |
| **Client navigation** (SPA) | top-down: `host → shell → profile` | Standard browser; `globalThis` always available |
| **Hydration** (SSR → client takeover) | **bottom-up**: `profile → shell → host` | `hostConnected` fires on children before parents |

## Key Constraint: Hydration is Bottom-Up

During hydration, child components connect _before_ their ancestors. A child cannot rely on
a parent-provided context or service being ready when its own `hostConnected` fires — the parent
hasn't connected yet.

### Resolution Pattern: defer to `hostWillLoad`

`hostWillLoad` runs after **all** `connectedCallback`s in the subtree complete, making it the
earliest hook that is guaranteed to run in every mode after the full tree is connected.

```typescript
// `undefined`  → resolved; no cleanup needed.
// function ref → pending; call it to remove any listener.
let cleanupPending: (() => void) | undefined;

return {
  hostConnected() {
    if (resolveNow()) return;       // fast path: provider already up (SSR / client nav)

    // Set a pending cleanup; hostWillLoad will retry after tree is fully connected (hydration).
    cleanupPending = scheduleGlobalListener();
  },

  hostWillLoad() {
    if (!cleanupPending) return;    // already resolved in hostConnected

    cleanupPending();               // remove the global listener
    cleanupPending = undefined;

    if (!resolveNow()) {
      value = getDefault();         // provider still absent — use default or throw
    }
  },

  hostDisconnected() {
    cleanupPending?.();
    cleanupPending = undefined;
  },
};
```

## `globalThis` vs `window`

Always use `globalThis`. Both `window` and `self` are flagged by the workspace oxlint config.

| | Browser | SSR (Stencil hydrate) |
|-|-|-|
| `window` | ✅ | ✅ mock provided by hydrate runtime |
| `globalThis` | ✅ | ✅ |

```typescript
// ❌ environment-specific alias
window.addEventListener(EVENT, listener);
window.removeEventListener(EVENT, listener);

// ✅ universal
globalThis.addEventListener(EVENT, listener);
globalThis.removeEventListener(EVENT, listener);
```

### Drop `typeof window === "undefined"` guards

Because Stencil's hydrate bundle always provides `window` through `globalThis`, the guard is
never true in a Stencil component context and should be removed.

```typescript
// ❌ unnecessary guard
if (typeof window === "undefined") {
  cleanupPending = () => {};
  return;
}
globalThis.addEventListener(EVENT, listener);

// ✅ simplified
globalThis.addEventListener(EVENT, listener);
cleanupPending = () => globalThis.removeEventListener(EVENT, listener);
```

## Decision Guide

When writing initialization-sensitive code, apply these checks:

1. **Runs in `hostConnected`?**
   → Assume bottom-up hydration is possible. Do not rely on a parent being initialized yet.

2. **Uses `window` or `self`?**
   → Replace with `globalThis`. Remove `typeof window === "undefined"` guards.

3. **Waits for a late provider or dependency?**
   → Set `cleanupPending` in `hostConnected`; resolve and clear it in `hostWillLoad`.

4. **Needs a "tree fully connected" guarantee?**
   → Use `hostWillLoad` — it fires after all `connectedCallback`s complete in every mode.

## Error Handling

- If context is never resolved by `hostWillLoad`, either call `key.getDefault()` to use the
  registered singleton, or throw with a descriptive message naming the missing context key.
- If `requestUpdate()` throws inside a global listener callback (component not fully initialized),
  swallow the error — `hostWillLoad` will still see the resolved value on its next run.
