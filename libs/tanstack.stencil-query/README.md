# @ssv/tanstack.stencil-query

TanStack Query bindings for [StencilJS](https://stenciljs.com/) — reactive server-state management with SSR hydration support.

## Install

```bash
pnpm add @ssv/tanstack.stencil-query @tanstack/query-core
```

**Peer dependencies:** `@ssv/stencil-core`, `@stencil/core >=4`

## Quick start

```ts
// posts.api.ts — typed query factories + wrapper hooks (vertical slice)
import { queryOptions, useQuery, useMutation } from "@ssv/tanstack.stencil-query";

export const postKeys = {
  all: ["posts"] as const,
  list: () => [...postKeys.all, "list"] as const,
  detail: (id: number) => [...postKeys.all, "detail", id] as const,
};

export const postQueries = {
  list: () => queryOptions({ queryKey: postKeys.list(), queryFn: fetchPosts }),
  detail: (id: number) => queryOptions({ queryKey: postKeys.detail(id), queryFn: () => fetchPost(id) }),
};

export function usePosts() {
  const postsRef = useQuery(postQueries.list());
  const createRef = useMutation({ mutationFn: (title: string) => apiCreatePost(title) });

  return {
    get posts() { return postsRef(); },
    get create() { return createRef(); },
  };
}
```

```ts
// posts.tsx
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

| Export                     | Kind | Purpose                                                             |
| -------------------------- | ---- | ------------------------------------------------------------------- |
| `queryOptions`             | fn   | Type-safe query factory; stamps `DataTag` on `queryKey`             |
| `useQuery`                 | fn   | Subscribes to a query; returns `Ref<UseQueryResult>`                |
| `useQueries`               | fn   | Subscribes to a list of queries in parallel; returns `Ref<results>` |
| `useMutation`              | fn   | Subscribes to a mutation; returns `Ref<UseMutationResult>`          |
| `usePrefetchQuery`         | fn   | Seeds the cache on `hostWillLoad`; returns `void`                   |
| `provideQueryClient`       | fn   | Registers a `QueryClient` in context; returns the client            |
| `useQueryClient`           | fn   | Resolves the nearest `QueryClient` from context                     |
| `useQueryHydration`        | fn   | Wires SSR dehydration and client-side hydration via `TransferState` |
| `useQueryClientRef`        | fn   | Returns a `Ref<QueryClient>` from context                           |
| `Ref<T>`                   | type | Callable ref — `ref()` or `ref.current` reads the live value        |
| `UseQueryRef<T>`           | type | `Ref<UseQueryResult<T>>` — return type of `useQuery`                |
| `DefinedUseQueryRef<T>`    | type | `Ref<DefinedUseQueryResult<T>>` — when `initialData` is defined     |
| `UseMutationRef<T,E,V>`    | type | `Ref<UseMutationResult<T,E,V>>` — return type of `useMutation`      |
| `UseQueryResult<T>`        | type | Full query result shape (`data`, `isPending`, `isError`, …)         |
| `UseMutationResult<T,E,V>` | type | Full mutation result shape + `mutate` + `mutateAsync`               |
| `UseQueriesOptions<T,R>`   | type | Options for `useQueries` — `queries` array + optional `combine`     |
| `QueriesResults<T>`        | type | Tuple of `UseQueryResult`s inferred from the `queries` array        |
| `QueriesOptions<T>`        | type | Tuple of per-query options inferred from the `queries` array        |
| `DefinedQueryOptions`      | type | `UseQueryOptions` variant asserting `queryFn` is never `skipToken`  |

All `@tanstack/query-core` exports are also re-exported from this package.

## Ref pattern

`useQuery` and `useMutation` return a `Ref<T>` — a callable function that reads the current result live from the observer on each call.

```ts
readonly #posts = useQuery(postQueries.list());

render() {
  const { data, isPending } = this.#posts(); // () reads the live result
}
```

The **wrapper hook pattern** uses getter properties to absorb `()` — the component sees plain property access (`this.#api.posts.data`) and stays decoupled from the ref.

## `queryOptions`

Creates a typed, reusable query options object. The `queryKey` carries a `DataTag` so the data type flows through `getQueryData` / `setQueryData` / `invalidateQueries` without manual casting.

```ts
export const postKeys = {
  all: ["posts"] as const,
  list: () => [...postKeys.all, "list"] as const,
  detail: (id: number) => [...postKeys.all, "detail", id] as const,
};

export const postQueries = {
  list: () => queryOptions({ queryKey: postKeys.list(), queryFn: fetchPosts }),
  detail: (id: number) => queryOptions({ queryKey: postKeys.detail(id), queryFn: () => fetchPost(id) }),
};

// Type flows automatically — no explicit generics needed:
const data = qc.getQueryData(postQueries.list().queryKey); // Post[]
```

## Provider setup

```ts
@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient(
    new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } } })
  );
}
```

Pass a `QueryClient` instance directly or a `ProvideQueryClientOptions` object to reuse an existing client:

```ts
readonly #qc = provideQueryClient({ client: existingClient });
```

### SSR hydration

Decouple the `QueryClient` from its transfer-state wiring with `useQueryHydration`. Call it inside `setup()` **after** `provideTransferState` and `provideQueryClient`.

```ts
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, useQueryHydration } from "@ssv/tanstack.stencil-query";

@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient();
  readonly _ = this.setup(() => {
    provideTransferState("my-scope");
    useQueryHydration();
  });
}
```

On the **server**, `useQueryHydration` serializes the client cache into the transfer-state `<script>` tag after render. On the **client**, it reads that state and calls `hydrate()` before the first render.

#### Complete SSR pattern

Pair `useQueryHydration` with `usePrefetchQuery` to seed the cache on `hostWillLoad` (Stencil awaits it during SSR before rendering). Set `staleTime` on the query so the client uses the hydrated data instead of immediately refetching.

```ts
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, usePrefetchQuery, useQueryHydration } from "@ssv/tanstack.stencil-query";

const STALE_TIME = 5 * 60_000; // 5 min — data is fresh from SSR, skip immediate refetch

@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly #qc = provideQueryClient();
  // Prefetch runs in hostWillLoad — Stencil awaits it on the server before rendering.
  // On the client it deduplicates against any in-flight request for the same key.
  readonly _prefetch = usePrefetchQuery({ queryKey: ["posts"], queryFn: fetchPosts, staleTime: STALE_TIME });
  readonly _ = this.setup(() => {
    provideTransferState("posts-scope");
    useQueryHydration();
  });

  readonly #posts = useQuery(() => ({ queryKey: ["posts"], queryFn: fetchPosts, staleTime: STALE_TIME }));

  render() {
    const { data, isPending } = this.#posts();
    // ...
  }
}
```

#### Multiple QueryClients

When two clients share a single `provideTransferState` scope, pass a `key` option to namespace their transfer-state entries:

```ts
readonly #posts = provideQueryClient();
readonly #users = new QueryClient();
readonly _ = this.setup(() => {
  provideTransferState("my-scope");
  useQueryHydration({ key: "posts" });
  useQueryHydration({ client: this.#users, key: "users" });
});
```

See [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/) for full examples.

## Prefetch

`usePrefetchQuery` seeds the cache on `hostWillLoad` — before any `useQuery` in the component subscribes. Skips the fetch if a cache entry already exists.

```ts
// Inline — seeds cache before children connect
@Component({ tag: "app-posts-page", shadow: true })
export class AppPostsPage extends SsvElement {
  readonly _prefetch = usePrefetchQuery(postQueries.list());
  readonly #posts = useQuery(postQueries.list()); // cache hit — no loading state
}
```

**Reusable wrapper pattern** — define outside the component so any tree can seed the same key:

```ts
// posts.api.ts
export function prefetchPosts(client?: QueryClient | Ref<QueryClient>): void {
  usePrefetchQuery(postQueries.list(), client);
}

export function usePrefetchedPosts(client?: QueryClient | Ref<QueryClient>) {
  return useQuery(postQueries.list(), client);
}
```

```ts
// root.tsx — seeds before child renders
readonly _prefetch = prefetchPosts();
```

```ts
// posts.tsx — receives pre-seeded data immediately
readonly #posts = usePrefetchedPosts();
```

## `useQueries`

Subscribes to a **list of queries in parallel** and schedules a re-render whenever any result changes — the analogue of react-query's `useQueries` / angular's `injectQueries`. Returns a `Ref` whose value is the **tuple of results** (one `UseQueryResult` per query), with each element's `data` / `error` types preserved.

```ts
@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly #posts = useQueries(() => ({
    queries: this.ids.map(id => ({ queryKey: ["post", id], queryFn: () => fetchPost(id) })),
  }));

  render() {
    const results = this.#posts(); // () reads the live tuple of results
    const allLoaded = results.every(r => r.isSuccess);
    return <ul>{results.map(r => r.isSuccess && <li>{r.data.title}</li>)}</ul>;
  }
}
```

Pass a **getter function** for reactive options (e.g. when the query list depends on a `@Prop`). Pass an explicit `client` to bypass context — useful in unit tests.

### `combine`

Provide a `combine` function to derive a single value from all results; the return type narrows accordingly:

```ts
readonly #summary = useQueries({
  queries: [a, b, c],
  combine: results => ({
    total: results.length,
    loaded: results.filter(r => r.isSuccess).length,
    pending: results.some(r => r.isPending),
  }),
});

render() {
  const { loaded, total } = this.#summary();
}
```

### Reusable wrapper pattern

Like `useQuery`, define the hook outside the component so any tree can compose the same parallel queries:

```ts
// posts.api.ts
export function usePostsByIds(getIds: () => number[], client?: QueryClient) {
  return useQueries(() => ({ queries: getIds().map(id => postQueries.detail(id)) }), client);
}
```

```ts
// posts.tsx
readonly #posts = usePostsByIds(() => this.ids);
```

See the full example: [apps/stencil-playground/src/examples/ts-query/use-queries/](../../apps/stencil-playground/src/examples/ts-query/use-queries/)

## Devtools

Install the peer dependency:

```bash
pnpm add -D @tanstack/query-devtools
```

```ts
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";

@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient();
  readonly _devtools = useQueryDevtools();
}
```

Devtools are **disabled by default** outside `NODE_ENV === 'development'`. Pass `enabled: true` to force them on.

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
  readonly _signalWatcher = useSignalWatcher();

  readonly #posts = $useQuery(postQueries.list());
  readonly #create = $useMutation({ mutationFn: (title: string) => apiCreatePost(title) });

  readonly #canSubmit = computed(() => !!this.#inputValue() && !this.#create.isPending());

  render() {
    return (
      <button disabled={!this.#canSubmit()} onClick={() => this.#create.mutate("New post")}>
        {this.#create.isPending() ? "Creating…" : "Create"}
      </button>
    );
  }
}
```

### Signals API

| Export                 | Kind | Purpose                                                       |
| ---------------------- | ---- | ------------------------------------------------------------- |
| `$useQuery`            | fn   | Per-field signal store + `refetch`                            |
| `$useQueries`          | fn   | Single `Signal` of the parallel-queries results array         |
| `$useMutation`         | fn   | Per-field signal store + `mutate` / `mutateAsync` / `reset`   |
| `$usePrefetchQuery`    | fn   | Reactive prefetch — re-fires when signal-based options change |
| `QuerySignalResult`    | type | `Store<QueryStateData> & { refetch }`                         |
| `MutationSignalResult` | type | `Store<MutationStateData> & { mutate, mutateAsync, reset }`   |

### `$useQuery` vs `useQuery`

|                             | `useQuery`                         | `$useQuery`                                               |
| --------------------------- | ---------------------------------- | --------------------------------------------------------- |
| Return                      | `Ref<UseQueryResult>` — single ref | `Store<QueryStateData> & { refetch }` — per-field signals |
| Read                        | `ref()` or `ref.current`           | `store.data()`, `store.isPending()`                       |
| Re-render granularity       | Any field change re-renders        | Only fields read during last render                       |
| Requires `useSignalWatcher` | No                                 | Yes                                                       |
| Reactive options            | `useQuery(() => opts)`             | Same                                                      |

### Reactive options

Pass a getter to recompute options when a signal changes:

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

### Signal-driven prefetch (`$usePrefetchQuery`)

Seeds the cache whenever the signal-based options change. Requires `useSignalWatcher()`.
Return `undefined` / `null` / `false` from the getter to skip the prefetch (e.g. when the id is absent).

```ts
import { $usePrefetchQuery } from "@ssv/tanstack.stencil-query/signals";

@Component({ tag: "app-hover-list", shadow: true })
export class AppHoverList extends SsvElement {
  readonly _signalWatcher = useSignalWatcher();
  readonly #hoveredId = signal<number | null>(null);

  // Re-fires on every hoveredId change; skips when null
  readonly _prefetch = $usePrefetchQuery(() => {
    const id = this.#hoveredId();
    if (!id) {
      return;
    }
    return postQueries.detail(id);
  });

  readonly #hoveredPost = useHoveredPost(this.#hoveredId);
}
```

### `$useQueries`

The signals counterpart of `useQueries` — subscribes to a list of queries in parallel and exposes the combined result as a **single `Signal`** of the results array (mirrors angular's `injectQueries`). Reads inside `render()` or `computed()` are tracked. Requires `useSignalWatcher()`.

```ts
import { $useQueries } from "@ssv/tanstack.stencil-query/signals";
import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";

@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly _signalWatcher = useSignalWatcher();
  readonly #ids = signal([1, 2, 3]);

  // Getter form — re-subscribes when #ids changes
  readonly #posts = $useQueries(() => ({
    queries: this.#ids().map(id => ({ queryKey: ["post", id], queryFn: () => fetchPost(id) })),
  }));

  readonly #loadedCount = computed(() => this.#posts().filter(r => r.isSuccess).length);

  render() {
    const results = this.#posts();
    return <p>Loaded {this.#loadedCount()} / {results.length}</p>;
  }
}
```

Provide a `combine` function to derive a single value from all results — the signal's type narrows accordingly, exactly like `useQueries`.

### Derived signals with `computed`

```ts
readonly #isLoading = computed(() => this.#posts.isPending() || this.#posts.isFetching());
readonly #hasError = computed(() => this.#posts.isError());
readonly #canRetry = computed(() => this.#hasError() && !this.#posts.isFetching());
```

Use `peek` for untracked reads inside event handlers:

```ts
const hasData = this.#posts.data.peek() !== undefined;
```

See the full example: [apps/stencil-playground/src/examples/ts-query/posts-signals/](../../apps/stencil-playground/src/examples/ts-query/posts-signals/)

## Examples

Full working demo: [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/)

