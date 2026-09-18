import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	dts: true,
	tsconfig: "tsconfig.lib.json",
	outputOptions: {
		chunkFileNames: "_internal/[name].js",
	},
});
