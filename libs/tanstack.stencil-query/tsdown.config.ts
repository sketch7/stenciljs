import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/signals/index.ts", "src/dev-tools/index.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
	outputOptions: {
		chunkFileNames: "_internal/[name].js",
	},
});
