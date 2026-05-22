# @ssv/tanstack.stencil-query

TanStack Query bindings for [StencilJS](https://stenciljs.com/) — reactive server-state management with SSR hydration support.

## Install

```bash
pnpm add @ssv/tanstack.stencil-query @tanstack/query-core
```

**Peer dependencies:** `@ssv/stencil.core`, `@stencil/core >=4`

## Quick start

```ts
// posts.api.ts — wrapper hook (vertical slice co-location)
import { useQuery, useMutation } from "@ssv/tanstack.stencil-query";

export function usePosts() {
  const postsRef = useQuery(() => ({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    staleTime: 5 * 60 * 1000,
  }));

  const createRef = useMutation({
    mutationFn: (title: string) => apiCreatePost(title),
  });

  // Getter properties absorb the () call — component accesses plain properties
  return {
    get posts() {
      return postsRef();
    },
    get create() {
      return createRef();
    },
  };
}
```

```ts
// posts.tsx — component accesses plain property paths, no () needed
@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly #api = usePosts();

  render() {
    const { data, isPending, isError } = this.#api.posts;
    const { mutate, isPending: isCreating } = this.#api.create;
    // ...
  }
}
```

## API

| Export                     | Kind | Purpose                                                         |
| -------------------------- | ---- | --------------------------------------------------------------- |
| `useQuery`                 | fn   | Subscribes to a query; returns `Ref<UseQueryResult>`            |
| `useMutation`              | fn   | Subscribes to a mutation; returns `Ref<UseMutationResult>`      |
| `provideQueryClient`       | fn   | Registers a `QueryClient` in context; returns the client        |
| `useQueryClient`           | fn   | Resolves the nearest `QueryClient` from context                 |
| `Ref<T>`                   | type | Callable ref — `ref()` or `ref.current` reads the live value    |
| `UseQueryRef<T>`           | type | `Ref<UseQueryResult<T>>` — return type of `useQuery`            |
| `DefinedUseQueryRef<T>`    | type | `Ref<DefinedUseQueryResult<T>>` — when `initialData` is defined |
| `UseMutationRef<T,E,V>`    | type | `Ref<UseMutationResult<T,E,V>>` — return type of `useMutation`  |
| `UseQueryResult<T>`        | type | Full query result shape (`data`, `isPending`, `isError`, …)     |
| `UseMutationResult<T,E,V>` | type | Full mutation result shape + `mutate` + `mutateAsync`           |

All `@tanstack/query-core` exports are also re-exported from this package.

## Ref pattern

`useQuery` and `useMutation` return a `Ref<T>` — a callable function that reads the current result live from the observer on each call.

```ts
// Direct use in a component — call the ref to get the current result
readonly #posts = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });

render() {
  const { data, isPending } = this.#posts(); // () reads the live result
  // or: this.#posts.current
}
```

The **wrapper hook pattern** above uses getter properties to absorb `()` — the component sees plain property access (`this.#api.posts.data`) and needs no changes when the underlying ref changes.

## Provider setup

```ts
@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient({ queryClient: new QueryClient() });
}
```

### SSR hydration

```ts
import { provideTransferState } from "@ssv/stencil.core/transfer-state";

readonly #ts = provideTransferState("my-scope");
readonly #qc = provideQueryClient({ withHydration: this.#ts });
```

The query client hydrates from the serialized transfer-state script tag on connect, then removes the script. See [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/) for a full SSR + client-side example.

## Devtools

Install the peer dependency:

```bash
pnpm add -D @tanstack/query-devtools
```

Import from the `dev-tools` sub-entrypoint and call the hook in any component that has a `QueryClient` in context:

```ts
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";

@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient();
  _ = useQueryDevtools();
}
```

Devtools are **disabled by default in non-development environments** (`process.env.NODE_ENV !== 'development'`), matching the React Query convention. Pass `enabled: true` to force them on in any environment.

| Option                | Type                     | Default                                  | Description                             |
| --------------------- | ------------------------ | ---------------------------------------- | --------------------------------------- |
| `enabled`             | `boolean`                | `process.env.NODE_ENV === 'development'` | Mount the devtools panel                |
| `client`              | `QueryClient`            | context                                  | Override the QueryClient from context   |
| `buttonPosition`      | `DevtoolsButtonPosition` | `'bottom-right'`                         | Position of the TanStack logo button    |
| `position`            | `DevtoolsPosition`       | `'bottom'`                               | Position of the devtools panel          |
| `initialIsOpen`       | `boolean`                | `false`                                  | Open the panel by default               |
| `errorTypes`          | `DevtoolsErrorType[]`    | —                                        | Custom error types shown in the panel   |
| `styleNonce`          | `string`                 | —                                        | CSP nonce for injected `<style>` tags   |
| `shadowDOMTarget`     | `ShadowRoot`             | —                                        | Attach devtools styles to a shadow root |
| `hideDisabledQueries` | `boolean`                | `false`                                  | Hide disabled queries from the panel    |
| `theme`               | `DevtoolsTheme`          | `'system'`                               | Color theme                             |

## Signals sub-entry (`/signals`)

Import from `@ssv/tanstack.stencil-query/signals` for fine-grained, per-field signals instead of a single `Ref`. Requires `useSignalWatcher()` and `@ssv/stencil-signals`.

```ts
import { $useQuery, $useMutation } from "@ssv/tanstack.stencil-query/signals";
import { computed, useSignalWatcher } from "@ssv/stencil-signals";

@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly signalWatcher = useSignalWatcher();

  readonly #posts = $useQuery(() => ({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  }));

  readonly #create = $useMutation({
    mutationFn: (title: string) => apiCreatePost(title),
  });

  // Derived signal — recomputes only when the two source signals change
  readonly canSubmit = computed(() => !!this.inputValue() && !this.#create.isPending());

  render() {
    return (
      <button disabled={!this.canSubmit()} onClick={() => this.#create.mutate("New post")}>
        {this.#create.isPending() ? "Creating…" : "Create"}
      </button>
    );
  }
}
```

### Signals API

| Export                 | Kind | Purpose                                                     |
| ---------------------- | ---- | ----------------------------------------------------------- |
| `$useQuery`            | fn   | Per-field signal store + `refetch`                          |
| `$useMutation`         | fn   | Per-field signal store + `mutate` / `mutateAsync` / `reset` |
| `QuerySignalResult`    | type | `Store<QueryStateData> & { refetch }`                       |
| `MutationSignalResult` | type | `Store<MutationStateData> & { mutate, mutateAsync, reset }` |

### `$useQuery` vs `useQuery`

|                             | `useQuery`                               | `$useQuery`                                               |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| Return                      | `Ref<UseQueryResult>` — single ref       | `Store<QueryStateData> & { refetch }` — per-field signals |
| Read                        | `ref()` or `ref.current`                 | `store.data()`, `store.isPending()`                       |
| Re-render granularity       | Any field change re-renders              | Only fields read during last render                       |
| Requires `useSignalWatcher` | No                                       | Yes                                                       |
| Reactive options            | Getter function: `$useQuery(() => opts)` | Same                                                      |

### Reactive options

Pass a getter function to recompute options when a signal changes:

```ts
readonly #userId = signal(1);

readonly #user = $useQuery(() => {
    const userId = this.#userId();
    return {
      queryKey: ["user", userId] as const,
      queryFn: ({ signal }) => fetchUser(userId, { signal }),
    };
});
```

### Derived signals with `computed`

Fine-grained signals compose cleanly with `computed`:

```ts
readonly #isLoading = computed(() => this.#posts.isPending() || this.#posts.isFetching());
readonly #hasError = computed(() => this.#posts.isError());
readonly #canRetry = computed(() => this.#hasError() && !this.#posts.isFetching());
```

Use `peek` for untracked reads in handlers or helper functions:

```ts
const hasDataNow = this.#posts.data.peek() !== undefined;
```

See the full example: [apps/stencil-playground/src/examples/ts-query/posts-signals/](../../apps/stencil-playground/src/examples/ts-query/posts-signals/)

## Examples

Full working demo: [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/)
