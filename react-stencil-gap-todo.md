# React → Stencil Gap: TODO & Improvement Notes

> Discovered while building the LoL Draft Lobby Simulator demo.
> These are gaps where the Stencil + `@ssv/*` library stack is more verbose, less safe,
> or simply missing a first-class equivalent compared to React + React Query.

---

## Component Model

| #   | Gap                                                                                                                             | React equivalent                                       | Current workaround                                                | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | -------- |
| 1   | **No inline `Context.Provider`** — context providers must always be separate `@Component` classes. Can't wrap a subtree in JSX. | `<MyContext.Provider value={x}>…</MyContext.Provider>` | Separate host component calls `provideContext(key, factory)`      | Medium   |
| 2   | **No error boundaries** — an uncaught throw in `render()` crashes the whole tree without recovery                               | `<ErrorBoundary fallback={…}>`                         | Try/catch in render, show fallback manually                       | High     |
| 3   | **No `React.memo` / `shouldComponentUpdate`** per-component optimisation — every `@Prop` change re-renders the whole component  | `React.memo(Component, propsAreEqual)`                 | None (Stencil re-renders are fast but no skip)                    | Low      |
| 4   | **No `forwardRef`** — can't expose an internal DOM element ref to a parent                                                      | `React.forwardRef`                                     | Expose the element via `@Method() getEl()` or public `@Element()` | Low      |
| 5   | **No `React.lazy()` / dynamic component splitting** — all Stencil components are bundled together                               | `React.lazy(() => import('./Heavy'))`                  | Use dist-custom-elements lazy loading via `defineCustomElements`  | Medium   |
| 6   | **No fragment with key (`<> key={x}>`)** — keyed fragments not supported; need a wrapping element                               | `<React.Fragment key={x}>`                             | Wrap in `<div key={x}>`                                           | Low      |
| 7   | **`children` prop is untyped** — `<slot>` content has no type safety or render-prop pattern                                     | `children: React.ReactNode`, render props              | Document expected slot content in JSDoc                           | Medium   |
| 8   | **No `useId()`** — accessibility IDs (aria-labelledby, htmlFor) must be generated manually                                      | `React.useId()`                                        | `crypto.randomUUID()` or counter in constructor                   | Medium   |
| 9   | **No `Suspense` within Stencil trees** — async component loading can't suspend; loading states must be handled manually         | `<Suspense fallback={…}>`                              | Manual `isPending` / loading state in render                      | High     |

---

## Hooks / State

| #   | Gap                                                                                                                    | React equivalent                                                           | Current workaround                                                                    | Priority |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| 10  | **No `useMemo` / `useCallback`** — no built-in memoization of derived values or stable function references             | `useMemo(fn, deps)`, `useCallback(fn, deps)`                               | `computed()` from stencil-signals (requires signal inputs), or manual instance fields | Medium   |
| 11  | **No `useReducer`** — complex state transitions must be managed via TanStack Store actions or manual `@State` + logic  | `useReducer(reducer, initialState)`                                        | `createStore(initial, ({ setState }) => ({ … }))` from tanstack-store                 | Low      |
| 12  | **No `useTransition` / `useDeferredValue`** — no concurrent mode or deferred updates                                   | `useTransition()`, `useDeferredValue(value)`                               | Not applicable (no concurrent renderer in Stencil)                                    | Low      |
| 13  | **`useEffect` cleanup timing differs** — Stencil's `useEffect` cleanup runs in `hostDisconnected`, not between renders | `useEffect(() => { return cleanup; }, [dep])` — cleanup on next render too | Only use `useEffect` for mount/unmount side-effects, not inter-render cleanup         | Medium   |

---

## TanStack Query integration

| #   | Gap                                                                                                                                                 | React equivalent                                                            | Current workaround                                                     | Priority |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| 14  | **Optimistic update rollback is verbose** — `onMutate`/`onError`/`onSettled` pattern requires manual snapshot and setQueryData; no `context` helper | React Query's `context` from `onMutate` is typed and threaded automatically | Manual snapshot + `setQueryData` in `onError`                          | High     |
| 15  | **No `useSuspenseQuery`** — can't throw a Promise to trigger Suspense; queries must use `isPending` guards                                          | `useSuspenseQuery(options)`                                                 | Manual conditional rendering with `isPending`                          | High     |
| 16  | **No `QueryBoundary` component** — no reusable loading/error wrapper for query state                                                                | `QueryErrorResetBoundary` + `Suspense`                                      | Inline `isPending` / `isError` in every component                      | Medium   |
| 17  | **`useQuery` options getter re-evaluated on every render** — returning a new object every render can be subtle; deps tracking is manual             | Hook uses stable references internally                                      | Wrap in `computed()` for derived query options, or keep options static | Low      |
| 18  | **No `useInfiniteQuery` / `usePaginatedQuery`** — no first-class binding exists in `@ssv/tanstack.stencil-query`                                    | `useInfiniteQuery(options)`                                                 | Manually manage page state + `fetchNextPage` via `useQuery` + atom     | Medium   |

---

## Styling / Shadow DOM

| #   | Gap                                                                                                          | React equivalent                         | Current workaround                                                      | Priority |
| --- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------- | -------- |
| 19  | **Shadow DOM prevents global CSS class overrides** — consuming apps can't style internals via class names    | Plain CSS classes or CSS Modules         | CSS custom properties (`var(--token)`) for all themeable values         | Low      |
| 20  | **No CSS-in-JS or scoped Tailwind** — can't use Tailwind utilities directly inside Stencil shadow components | Tailwind, CSS Modules, styled-components | Scoped CSS files per component; design tokens via CSS custom properties | Low      |

---

## SSR

| #   | Gap                                                                                                                                                                               | React equivalent                                                                   | Current workaround                                                   | Priority |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| 21  | **`Build.isServer` required for `process.env` access in fetch functions** — browser bundles don't have `process`, so all `process.env` reads must be inside `if (Build.isServer)` | `typeof window === 'undefined'` check, or Next.js `getServerSideProps`             | Always use `Build.isServer` guard; document this pattern             | Medium   |
| 22  | **`EventSource` is browser-only** — SSE subscriptions must be created in `hostConnected` (not called during SSR), but extra guards are needed in `hostDidRender` lifecycle        | `useEffect(() => { const es = new EventSource(…); }, [id])` — never runs on server | `hostConnected` + `hostDidRender` lifecycle with `lastDraftId` guard | Low      |

---

## Forms

| #   | Gap                                                                                                         | React equivalent                 | Current workaround                                           | Priority |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ | -------- |
| 23  | **No form state management library** — no React Hook Form or Formik equivalent for Stencil                  | `useForm()` from React Hook Form | Manual `@State` per field + `onInput` handlers               | Medium   |
| 24  | **`@Prop()` arrays/objects require new reference to trigger re-render** — mutating in-place is not detected | React immutability model (same)  | Always spread: `[...arr, newItem]` or `{ ...obj, key: val }` | Low      |

---

## Planned improvements to `@ssv/stencil.core`

- [ ] **`useId()`** — stable, SSR-safe ID generator hook
- [ ] **`ErrorController`** — `ReactiveController` for error boundaries at the Stencil level
- [ ] **`useQueryBoundary()` component** — wraps any `useQuery` result and renders loading/error/children automatically
- [ ] **`useMemo(factory, deps)`** — memoize derived values across renders using signal-based deps
- [ ] **Optimistic update helpers** for `useMutation` — snapshot/restore utilities to reduce `onMutate`/`onError` boilerplate
- [ ] **`useInfiniteQuery`** binding in `@ssv/tanstack.stencil-query`
