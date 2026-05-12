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
pnpm lint                           # lint all projects (oxlint)
pnpm fmt                            # format all projects (oxfmt)
pnpm fmt:check                      # check formatting (CI)
```

### Scaffolding

Use NX generators. Typical commands:

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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

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
