# sketch7.stenciljs

StencilJS component library monorepo. `libs/` holds publishable web-component libraries; `apps/` holds example/demo applications that consume them.

## Structure

```
apps/
  stencil-playground/   # StencilJS components (counter, todo, mouse, timer) — non-published
  vike-playground/      # Vike SSR app consuming stencil-playground via @stencil/ssr
libs/
  stencil.core/              # @ssv/stencil.core — ReactiveController host utilities
  stencil-signals/           # @ssv/stencil-signals — TC39 & Preact Signals integration for StencilJS
  tanstack.stencil-store/    # @ssv/tanstack.stencil-store — TanStack Store bindings for Stencil
  vite-plugin-stencil-watch/   # @ssv/vite-plugin-stencil-watch — HMR plugin for Stencil in Vite
```

## Libraries

| Package                                                                      | Description                                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@ssv/stencil.core`](libs/stencil.core/README.md)                           | `ReactiveController` / `ReactiveControllerHost` pattern — lifecycle-aware controllers for Stencil components                                           |
| [`@ssv/stencil-signals`](libs/stencil-signals/README.md)                     | TC39 & Preact Signals for Stencil — `useSignalWatcher`, `effect`, `derivedAsync`, `useSignalProps`, `createStore`; adoption guide for enterprise teams |
| [`@ssv/tanstack.stencil-store`](libs/tanstack.stencil-store/README.md)       | TanStack Store bindings for Stencil — `useSelector` and `useAtom` hooks with lifecycle-aware subscriptions                                             |
| [`@ssv/vite-plugin-stencil-watch`](libs/vite-plugin-stencil-watch/README.md) | Vite plugin that watches Stencil sources and triggers HMR in consuming apps                                                                            |

## Tech stack

| Tool                                                                  | Role                                             |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| [StencilJS](https://stenciljs.com/)                                   | Web-component authoring                          |
| [Vike](https://vike.dev/) + [vike-react](https://vike.dev/vike-react) | SSR framework (`vike-playground`)                |
| [@stencil/ssr](https://github.com/ionic-team/stencil-ssr)             | Compile-time SSR with Declarative Shadow DOM     |
| [@stencil/store](https://stenciljs.com/docs/stencil-store)            | Reactive state management for Stencil components |
| [Tailwind CSS v4](https://tailwindcss.com/)                           | Utility-first CSS (dark theme by default)        |
| [NX](https://nx.dev/)                                                 | Monorepo task runner                             |
| [pnpm](https://pnpm.io/) workspaces                                   | Package manager with catalog                     |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)                 | Linter                                           |
| [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)               | Formatter                                        |
| TypeScript 6                                                          | Strict mode                                      |

## Prerequisites

- Node.js ≥ 24.15.0
- pnpm ≥ 9.0.0

## Getting started

```bash
pnpm install
```

## Development

### `vike-playground` — SSR demo app with StencilJS components

```bash
pnpm dev
```

### Run individual packages

```bash
pnpm nx run stencil-playground:build   # build Stencil components once
pnpm nx run stencil-playground:dev     # Stencil watch mode only
pnpm nx run vike-playground:dev        # Vike dev server only (stencil must be built first)
```

## Common tasks

```bash
pnpm build          # build all projects
pnpm lint           # lint all projects
pnpm fmt            # format all projects
pnpm fmt:check      # check formatting (CI)
pnpm test           # run unit tests (if present)
```

NX-scoped commands:

```bash
pnpm nx run <project>:<target>          # run a single target
pnpm nx run-many -t build               # build all
pnpm nx affected -t build               # build only affected
pnpm nx graph                           # visualise project dependency graph
pnpm nx:reset                           # clear NX cache
```

## Scaffolding new packages

```bash
# New publishable StencilJS library
pnpm nx g @nx/js:lib libs/<name> --publishable --importPath=@ssv/<name>

# New example app
pnpm nx g @nx/js:app apps/<name>
```

> After generating: add a `project.json` with NX targets, update root `tsconfig.json` references, and register any new catalog deps in `pnpm-workspace.yaml`.

## Conventions

- **Naming:** library packages use `@ssv/<name>`; component tags follow `<prefix>-<name>` (e.g. `ssv-button`)
- **Exports:** named exports only in `libs/`; avoid default exports
- **Formatter:** Oxfmt — config at `.oxfmtrc.json`
- **Linter:** Oxlint — config at `oxlint.config.ts`
- **Catalog:** shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:` — use `catalog:` references in new `package.json` files
