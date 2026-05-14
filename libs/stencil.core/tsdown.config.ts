import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/testing/index.ts"],
	format: ["esm", "cjs"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
	deps: {
		neverBundle: ["@stencil/core"],
	},
});
