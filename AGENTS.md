# stenciljs

StencilJS component library monorepo. `libs/` holds publishable web-component libraries; `apps/` holds example/demo applications that consume them.

## Monorepo Structure

```
libs/   # StencilJS web-component libraries (publishable)
apps/   # Example/demo apps built with modern tooling (Vite + React / plain HTML)
```

> `pnpm-workspace.yaml` uses a `catalog:` for shared dependency versions (typescript, oxlint, @stencil/core). Use `catalog:` references in new `package.json` files.

## Tech Stack

| Tool                                                    | Role                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| [StencilJS](https://stenciljs.com/)                     | Web-component authoring (libs)                                |
| [NX](https://nx.dev/)                                   | Monorepo task runner & code generation                        |
| [pnpm](https://pnpm.io/)                                | Package manager (workspaces)                                  |
| TypeScript 6                                            | Strict mode, ES2022 target, `nodenext` module resolution      |
| SWC (`@swc-node/register`)                              | Fast TS compilation for NX tasks                              |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)   | Fast linter (replaces ESLint), config in `oxlint.config.ts`   |
| [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) | Fast formatter (replaces Prettier), config in `.oxfmtrc.json` |

## Key Commands

```bash
pnpm install                        # install all deps
pnpm nx run <project>:<target>      # run a task (build, test, lint, etc.)
pnpm nx run-many -t build           # build all projects
pnpm nx affected -t build           # build only affected projects
pnpm nx graph                       # visualise project dependency graph
pnpm test                           # run all tests (Vitest)
pnpm lint                           # lint all projects (oxlint)
pnpm fmt                            # format all projects (oxfmt)
pnpm fmt:check                      # check formatting (CI)
```

### Scaffolding

Use the `nx-generate` skill before scaffolding anything. Typical generators:

```bash
# New StencilJS library
pnpm nx g @nx/js:lib libs/<name> --publishable --importPath=@ssv/<name>

# New example app
pnpm nx g @nx/js:app apps/<name>
```

## Conventions

- **TypeScript**: strict mode, `es2022` target, `nodenext` module resolution, `@ssv/source` custom condition for local workspace imports
- **Formatter**: Oxfmt — config at `.oxfmtrc.json`, run `pnpm fmt` to format
- **Linter**: Oxlint — config at `oxlint.config.ts`, run `pnpm lint` to lint
- **Post-task**: always run `pnpm lint` then `pnpm fmt` after modifying files
- **Naming**: library packages use `@ssv/<name>` import paths; component names follow `<prefix>-<name>` convention (e.g. `ssv-button`)
- **Exports**: named exports only in libs; avoid default exports
- **StencilJS output targets**: configure React/Vue/Angular output targets in `stencil.config.ts` for framework consumers

## Key Libraries

| Package                                                                                                 | Purpose                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@ssv/stencil-core`](libs/stencil-core/src/index.ts)                                                   | `ReactiveController`/`ReactiveControllerHost` for lifecycle-aware controllers; `SsvElement` and `SsvElementMixin` for hosting controllers in Stencil components |
| [`@ssv/stencil-signals`](libs/stencil-signals/src/index.ts)                                             | TC39 / Preact Signals integration — activate ONE adapter in `globalScript`, then use `useSignalWatcher()` in components                                         |
| [`@ssv/stencil-ui`](libs/stencil-ui/src/index.ts)                                                       | Registry-driven composition system; `ssv-compose` dispatches to named component variants via a shared registry                                                  |
| [`@ssv/tanstack.stencil-store`](libs/tanstack.stencil-store/src/index.ts)                               | TanStack Store bindings — `useSelector` / `useAtom` with reactive re-render                                                                                     |
| [`@ssv/tanstack.stencil-query`](libs/tanstack.stencil-query/src/index.ts)                               | TanStack Query bindings — `useQuery` / `useMutation`; requires a `QueryClient` in context                                                                       |
| [`@ssv/vite-plugin-stencil-watch`](libs/vite-plugin-stencil-watch/src/lib/vite-plugin-stencil-watch.ts) | Vite plugin that watches Stencil sources, triggers rebuilds, and invalidates the Vite module graph for HMR in consuming apps                                    |

## Testing

- Framework: **Vitest** — run with `pnpm nx run <project>:test` or `pnpm test` for all
- Use `TestHost` from `@ssv/stencil-core/testing` to simulate the Stencil lifecycle without the full runtime
- Keep lifecycle tests (controllers) separate from pure logic tests — see [testing instructions](.github/instructions/testing.instructions.md)

## Dev Workflow

`pnpm dev` starts `vike-playground` on port 3100. [`vite-plugin-stencil-watch`](apps/vike-playground/vite.config.ts) watches `stencil-playground/src` (and peer libs via `watchDirs`), rebuilds Stencil on change, then hot-reloads the Vike app. React wrappers are auto-generated to `apps/stencil-playground/src/react/` on each Stencil build via `@stencil/react-output-target`.

## Skills Available

- `stenciljs-component-development` — StencilJS patterns: vertical slices, @stencil/store, ReactiveController, output targets
- `stenciljs-init-order` — Initialization order across SSR / client nav / hydration; context timing; `globalThis` vs `window`
- `nx-generate` — Scaffold libs/apps via NX generators (use this first for any scaffolding)
- `nx-workspace` — Explore projects, targets, and dependencies
- `link-workspace-packages` — Wire up workspace package dependencies
- `oxlint` — Run and configure oxlint after making code changes
- `vitest` — Vitest patterns: `it.each`, mocking, coverage

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
