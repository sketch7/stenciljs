import { defineConfig } from "tsdown";

export default defineConfig({
	format: ["esm", "cjs"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
	deps: {
		neverBundle: ["@stencil/core", "@ssv/stenciljs.core", "@tanstack/store"],
	},
});
