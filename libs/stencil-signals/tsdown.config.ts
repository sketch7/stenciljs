import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/extensions.ts", "src/tc39.ts", "src/preact.ts"],
	format: ["esm", "cjs"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
	deps: {
		neverBundle: ["@stencil/core", "@ssv/stencil.core", "@preact/signals-core", "signal-polyfill"],
	},
});
