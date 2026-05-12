# @ssv/vite-plugin-stencil-watch

Vite plugin that watches a [StencilJS](https://stenciljs.com/) package's source directory, re-runs the Stencil build on any user-authored file change, then invalidates the Vite module graph and triggers a full page reload for HMR.

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

### Watching workspace peer dependencies

When a Stencil lib depends on a local workspace package (e.g. `@ssv/stenciljs.core`), use `watchDirs` and `preBuildCommand` so changes in the peer also trigger a fresh Stencil build:

```ts
stencilWatch({
  packageDir: path.resolve(__dirname, "../stencil-playground"),
  watchDirs: [path.resolve(__dirname, "../../libs/stenciljs.core/src")],
  preBuildCommand: "pnpm --filter @ssv/stenciljs.core build",
}),
```

## Options

| Option            | Type       | Default                     | Description                                                                            |
| ----------------- | ---------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `packageDir`      | `string`   | **required**                | Absolute path to the Stencil package                                                   |
| `srcDir`          | `string`   | `<packageDir>/src`          | Source directory to watch                                                              |
| `buildCommand`    | `string`   | `"pnpm stencil build"`      | Shell command to build the Stencil package                                             |
| `generatedDirs`   | `string[]` | `["react","vue","angular"]` | Output dirs written by Stencil — excluded from watch to prevent infinite rebuild loops |
| `packageId`       | `string`   | `path.basename(packageDir)` | String used to match Vite module-graph entries for invalidation                        |
| `watchDirs`       | `string[]` | `[]`                        | Extra directories to watch (e.g. workspace peer sources)                               |
| `preBuildCommand` | `string`   | —                           | Command run before the main build (e.g. rebuild a workspace dep)                       |

## Example

See [apps/vike-playground/vite.config.ts](../../apps/vike-playground/vite.config.ts) for a real-world configuration.
