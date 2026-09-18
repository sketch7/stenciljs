# @ssv/vite-plugin-stencil-watch

Vite plugin that watches a [StencilJS](https://stenciljs.com/) package's source directory, re-runs the Stencil build on any user-authored file change, then invalidates the Vite module graph and triggers a full page reload.

- Use in a Vite app that consumes a **local** Stencil library via workspace symlink, to get file-watch → rebuild → HMR in one step during development
- Use `watchDirs` when the Stencil lib depends on other local workspace packages that should also trigger a rebuild
- Avoid in production builds — the plugin only activates in `serve` mode

## Install

```bash
pnpm add -D @ssv/vite-plugin-stencil-watch
```

**Peer dependency:** `vite >=5`

## Usage

```ts
// vite.config.ts
import path from "node:path";
import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    stencilWatch({
      packageDir: path.resolve(__dirname, "../my-stencil-lib"),
    }),
  ],
});
```

## Options

| Option            | Type       | Default                     | Description                                                                            |
| ----------------- | ---------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `packageDir`      | `string`   | **required**                | Absolute path to the Stencil package root                                              |
| `srcDir`          | `string`   | `<packageDir>/src`          | Source directory to watch                                                              |
| `buildCommand`    | `string`   | `"pnpm stencil build"`      | Shell command to build the Stencil package                                             |
| `watchDirs`       | `string[]` | `[]`                        | Extra directories to watch (e.g. workspace peer sources)                               |
| `preBuildCommand` | `string`   | —                           | Command run before the main build; use to rebuild a workspace dependency first         |
| `generatedDirs`   | `string[]` | `["react","vue","angular"]` | Output dirs written by Stencil — excluded from watch to prevent infinite rebuild loops |
| `packageId`       | `string`   | `path.basename(packageDir)` | String used to match Vite module-graph entries for invalidation                        |

### Watching workspace peer dependencies

When the Stencil lib depends on a local workspace package, use `watchDirs` + `preBuildCommand` so changes in the peer also trigger a fresh Stencil build:

```ts
stencilWatch({
  packageDir: path.resolve(__dirname, "../stencil-playground"),
  watchDirs: [path.resolve(__dirname, "../../libs/stencil-core/src")],
  preBuildCommand: "pnpm --filter @ssv/stencil-core build",
}),
```

## Example

See [apps/vike-playground/vite.config.ts](../../apps/vike-playground/vite.config.ts) for a real-world configuration.
