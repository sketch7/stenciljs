# @ssv/tanstack.stencil-query

TanStack Query bindings for [StencilJS](https://stenciljs.com/) — reactive server-state management with SSR hydration support.

## Install

```bash
pnpm add @ssv/tanstack.stencil-query @tanstack/query-core
```

**Peer dependencies:** `@ssv/stencil-core`, `@stencil/core >=4`

## Quick start

Define typed query factories and a wrapper hook in a vertical slice, then use it in the component:

```ts
// posts.api.ts
export const postKeys = {
  list: () => ["posts", "list"] as const,
  detail: (id: number) => ["posts", "detail", id] as const,
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

```tsx
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

## Ref pattern

`useQuery` and `useMutation` return a `Ref<T>` — call it as `ref()` to read the current result live:

```ts
readonly #posts = useQuery(postQueries.list());

render() {
  const { data, isPending } = this.#posts(); // () reads the live result
}
```

The wrapper hook pattern absorbs `()` via getter properties so components see plain property access.

## `queryOptions`

- Use to create type-safe, reusable query options; the `queryKey` carries a `DataTag` so types flow through `getQueryData` / `invalidateQueries` without casting

```ts
// Type flows automatically — no explicit generics needed:
const data = qc.getQueryData(postQueries.list().queryKey); // Post[]
```

## Provider setup

```ts
@Component({ tag: "app-root", shadow: true })
export class AppRoot extends SsvElement {
  readonly #qc = provideQueryClient(
    new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000 } } })
  );
}
```

## SSR hydration

- Use `useQueryHydration` to serialize the cache on the server and hydrate it on the client
- Call it inside `setup()` after `provideTransferState` and `provideQueryClient`
- Pair with `usePrefetchQuery` to seed the cache before render; set `staleTime` to skip refetch on the client

```ts
const STALE_TIME = 5 * 60_000;

@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly #qc = provideQueryClient();
  readonly _prefetch = usePrefetchQuery({ ...postQueries.list(), staleTime: STALE_TIME });
  readonly _ = this.setup(() => {
    provideTransferState("posts-scope");
    useQueryHydration();
  });

  readonly #posts = useQuery(() => ({ ...postQueries.list(), staleTime: STALE_TIME }));
}
```

## Prefetch

- Use to seed the cache on `hostWillLoad` before any `useQuery` subscribes; skips if the cache entry already exists

```ts
@Component({ tag: "app-posts-page", shadow: true })
export class AppPostsPage extends SsvElement {
  readonly _prefetch = usePrefetchQuery(postQueries.list());
  readonly #posts = useQuery(postQueries.list()); // cache hit — no loading state
}
```

## Signal-dependent queries & SSR (held queries)

When a query's `queryKey` is derived from a signal — a `@Prop`, a route param, a user selection,
another query's data, etc. — that value can be `undefined` for any number of reasons (not provided
yet, upstream not resolved, cleared, …). To avoid fetching with a half-formed key, a query is **held**
while its `queryKey` contains an `undefined` segment:

- the observer stays **idle** (it never fetches with an `undefined` key) — on client and server;
- during SSR, `hostWillLoad` **awaits** the held query: it watches the reactive options and, once the
  key resolves (the signal it reads changes — for whatever reason), prefetches **once** with the
  resolved key, so the data is in the server-rendered HTML instead of only filling in on the client.
  Bounded by a ~15s safety timeout so a never-resolving key can't block render.

```ts
// Key derived from a @Prop signal — held until the prop is set (for any reason).
readonly #post = $useQuery(() => ({ queryKey: ["post", this.postId], queryFn: () => fetchPost(this.postId!) }));

// Key derived from another query's data — one common case of the same thing.
readonly #posts = $useQuery(() => {
  const userId = this.#user.data()?.id;            // undefined until #user resolves
  return { queryKey: ["posts", userId], queryFn: () => fetchPosts(userId!) };
});
```

> **Convention — `undefined` vs `null`.** An `undefined` key segment means *"not ready yet"* and holds
> the query. A segment that is legitimately optional/absent should be `null` (or any concrete value),
> which is treated as a real value and fetches normally. Only `undefined` segments hold — so don't put
> `undefined` in a key to mean "no value"; use `null`.

## `useQueries`

- Use to subscribe to a list of queries in parallel — returns a `Ref` whose value is the tuple of results
- Pass a getter function when the query list depends on a `@Prop` or other reactive value
- Pass `combine` to derive a single value from all results

```ts
readonly #posts = useQueries(() => ({
  queries: this.ids.map(id => postQueries.detail(id)),
}));

render() {
  const results = this.#posts();
  return <ul>{results.map(r => r.isSuccess && <li>{r.data.title}</li>)}</ul>;
}
```

## Signals sub-entry (`/signals`)

- Use for per-field signal granularity — only fields read during last render cause a re-render
- Requires `useSignalWatcher()` from `@ssv/stencil-signals`

```ts
import { $useQuery, $useMutation } from "@ssv/tanstack.stencil-query/signals";
import { computed, useSignalWatcher } from "@ssv/stencil-signals";

@Component({ tag: "app-posts", shadow: true })
export class AppPosts extends SsvElement {
  readonly _watcher = useSignalWatcher();
  readonly #posts = $useQuery(postQueries.list());
  readonly #create = $useMutation({ mutationFn: (title: string) => apiCreatePost(title) });

  readonly #canSubmit = computed(() => !this.#create.isPending());

  render() {
    return (
      <button disabled={!this.#canSubmit()} onClick={() => this.#create.mutate("New post")}>
        {this.#create.isPending() ? "Creating…" : "Create"}
      </button>
    );
  }
}
```

## Devtools

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

Devtools are disabled by default outside `NODE_ENV === 'development'`. Pass `enabled: true` to force them on.

## Examples

Full working demo: [apps/stencil-playground/src/examples/ts-query/](../../apps/stencil-playground/src/examples/ts-query/)

