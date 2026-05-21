# @ssv/stenciljs

Fills the gaps in StencilJS for building real applications — composable lifecycle hooks, typed context, SSR transfer state, signals, and TanStack Query/Store bindings.

```ts
// Extract reusable logic into a controller — no connectedCallback boilerplate
function useMouseTracker() {
  return use(host => {
    let pos = { x: 0, y: 0 };
    const onMove = ({ clientX, clientY }: MouseEvent) => {
      pos = { x: clientX, y: clientY };
      host.requestUpdate();
    };
    return {
      hooks: {
        hostConnected() { globalThis.addEventListener('mousemove', onMove); },
        hostDisconnected() { globalThis.removeEventListener('mousemove', onMove); },
      },
      value: { get pos() { return pos; } },
    };
  });
}

@Component({ tag: 'ssv-tracker', shadow: true })
export class SsvTracker extends SsvElement {
  #mouse = useMouseTracker();   // reusable across any component
  render() {
    const { x, y } = this.#mouse.pos;
    return <span>{x}, {y}</span>;
  }
}
```

## Packages

| Package                                                                      | Description                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`@ssv/stencil.core`](libs/stencil.core/README.md)                           | Composable lifecycle hooks (`use`, `useEffect`), typed context, and SSR transfer state             |
| [`@ssv/stencil-signals`](libs/stencil-signals/README.md)                     | TC39 / Preact Signals integration — `useSignalWatcher`, `effect`, `computed`, `createStore`        |
| [`@ssv/stencil-ui`](libs/stencil-ui/README.md)                               | Registry-driven composition — `ssv-compose` dispatches to named variants without touching the host |
| [`@ssv/tanstack.stencil-query`](libs/tanstack.stencil-query/README.md)       | TanStack Query for Stencil — `useQuery` / `useMutation` with SSR prefetch and cache hydration      |
| [`@ssv/tanstack.stencil-store`](libs/tanstack.stencil-store/README.md)       | TanStack Store for Stencil — `useSelector` / `useAtom` with granular re-render                     |
| [`@ssv/vite-plugin-stencil-watch`](libs/vite-plugin-stencil-watch/README.md) | Vite plugin — watches Stencil sources and invalidates the Vite module graph for HMR                |

## Tooling

| Tool                                                    | Role                                                |
| ------------------------------------------------------- | --------------------------------------------------- |
| [NX](https://nx.dev/)                                   | Monorepo task runner                                |
| [pnpm](https://pnpm.io/) workspaces                     | Package manager with `catalog:` for shared versions |
| TypeScript 6                                            | Strict, `es2022`, `nodenext` resolution             |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)   | Linter (`oxlint.config.ts`)                         |
| [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) | Formatter (`.oxfmtrc.json`)                         |

## Getting started

Requires Node.js ≥ 24 and pnpm ≥ 9.

```bash
pnpm install
pnpm dev        # vike-playground on :3000 with Stencil HMR
pnpm preview    # build + serve for production preview
```

## Tasks

```bash
pnpm build          # build all projects
pnpm test           # run all tests
pnpm lint           # lint
pnpm fmt            # format
pnpm fmt:check      # format check (CI)

pnpm nx run <project>:<target>   # single target
pnpm nx affected -t build        # build only affected
pnpm nx graph                    # dependency graph
```

## Conventions

- Library packages: `@ssv/<name>` — component tags: `ssv-<name>`
- App packages: `@app/<name>` — component tags: `app-<name>`
- Named exports only in `libs/`; no default exports
- New `package.json` files use `catalog:` for shared dependency versions
