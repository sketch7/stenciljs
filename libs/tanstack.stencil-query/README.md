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
    get posts() { return postsRef(); },
    get create() { return createRef(); },
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

```bash
pnpm add @tanstack/query-devtools
```

Import from the `dev-tools` sub-entrypoint — `@tanstack/query-devtools` is only loaded when the hook runs, keeping it out of production bundles.

```ts
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";

@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient();
  _ = useQueryDevtools();
}
```

The devtools panel mounts to `document.body` and cleans up automatically when the host disconnects. No-ops during SSR.

**Options** (`UseQueryDevtoolsOptions`):

| Option                | Type                     | Default          | Purpose                                 |
| --------------------- | ------------------------ | ---------------- | --------------------------------------- |
| `client`              | `QueryClient`            | context client   | Override the client from context        |
| `buttonPosition`      | `DevtoolsButtonPosition` | `'bottom-right'` | Position of the TanStack logo button    |
| `position`            | `DevtoolsPosition`       | `'bottom'`       | Side the panel opens on                 |
| `initialIsOpen`       | `boolean`                | `false`          | Open the panel on first mount           |
| `errorTypes`          | `DevtoolsErrorType[]`    | `[]`             | Custom errors to surface in the panel   |
| `theme`               | `DevtoolsTheme`          | `'system'`       | Color theme                             |
| `styleNonce`          | `string`                 | —                | CSP nonce for injected `<style>` tags   |
| `shadowDOMTarget`     | `ShadowRoot`             | —                | Attach styles to a specific shadow root |
| `hideDisabledQueries` | `boolean`                | `false`          | Hide disabled queries from the panel    |

## Examples

Full working demo: [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/)
