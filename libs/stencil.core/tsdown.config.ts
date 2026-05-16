import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/testing/index.ts", "src/transfer-state/index.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
	deps: {
		neverBundle: ["@stencil/core"],
	},
});
