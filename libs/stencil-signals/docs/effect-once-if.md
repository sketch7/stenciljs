# effectOnceIf

Execute a side effect **once** when a condition becomes truthy, then dispose automatically. Returns a `WatcherRef` (`{ dispose() }`).

**Import:** `@ssv/stencil-signals/extensions`

**Use case:** Run one-time initialization, log events, or trigger async operations when a specific state is met (e.g., when data loads, when user authenticates, when a feature flag is enabled).

## Signature

```ts
function effectOnceIf<T>(
  condition: () => T,
  execution: (value: NonNullable<T>) => void,
): WatcherRef;
```

- **`condition`**: Signal-reading function that returns a value. If truthy and non-nullish, triggers execution.
- **`execution`**: Called once with the truthy value, in an untracked context.
- **Returns**: `WatcherRef` with a `dispose()` method to cancel early.

## When to use

✓ **One-time setup** when a dependency becomes available (auth token, config loaded, user selected).
✓ **Async triggers** — fetch data once a filter becomes set, without re-running on every change.
✓ **Event logging** — record when user enters a feature for the first time.

✗ **Multiple executions** — use `effect()` instead ([effect.md](effect.md)).
✗ **Conditional rendering** — use a computed or template conditional.

## Examples

### Wait for user before fetching profile

```ts
import { signal } from "@ssv/stencil-signals";
import { effectOnceIf } from "@ssv/stencil-signals/extensions";

const userId = signal<number | null>(null);
const userProfile = signal<Profile | null>(null);

effectOnceIf(
  () => userId(),
  id => {
    // Runs once when userId changes to a truthy value
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(profile => userProfile.set(profile));
  },
);
```

### Log feature gate activation

```ts
const featureEnabled = signal(false);

effectOnceIf(
  () => featureEnabled(),
  () => {
    console.log("Feature X activated");
    analytics.track("feature_enabled", { name: "X" });
  },
);
```

### Initialize subsystem on config load

```ts
const config = signal<AppConfig | null>(null);

effectOnceIf(
  () => config(),
  cfg => {
    initializeTheme(cfg.theme);
    initializeLocale(cfg.locale);
  },
);
```

## Execution model

| Step                 | Behavior                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| **Create**           | `condition()` is read synchronously (tracked as a dependency).           |
| **Condition falsy**  | Effect waits; dependency change re-checks condition.                     |
| **Condition truthy** | `execution(value)` runs in untracked context, then effect self-disposes. |
| **After dispose**    | Condition changes no longer trigger re-runs.                             |

If the condition is **already truthy** on creation:

```ts
effectOnceIf(
  () => true,
  () => console.log("Runs immediately"),
);
// logs "Runs immediately" synchronously
```

## Manual disposal

Cancel execution if condition is met later:

```ts
const ref = effectOnceIf(() => userId(), loadProfile);

// Later, if you want to prevent execution even if userId becomes truthy:
ref.dispose();
```

## Relationship to `effect()`

| Feature                   | `effect()` | `effectOnceIf()`    |
| ------------------------- | ---------- | ------------------- |
| Runs on dependency change | ✓          | ✗ (once only)       |
| Untracked execution       | ✗          | ✓                   |
| Explicit disposal         | ✓          | ✓ (auto after exec) |
| Cleanup callbacks         | ✓          | ✗                   |
| Condition checking        | ✓          | ✓                   |

Use `effect()` with a guard condition if you need cleanup:

```ts
effect(() => {
  if (!userId()) return; // guard
  loadProfile(userId());
  // cleanup here if needed
});
```

## TC39 Signals

`effectOnceIf` is powered by the TC39 Signals adapter configured in your `globalScript`. Both TC39 and Preact backends work identically.
