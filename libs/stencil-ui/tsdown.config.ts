import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { compose: "src/compose/index.ts" },
	format: ["esm"],
	platform: "neutral",
	hash: false,
	clean: false,
	tsconfig: "tsconfig.lib.json",
	deps: {
		neverBundle: ["@stencil/core", "@ssv/stencil.core"],
	},
});
