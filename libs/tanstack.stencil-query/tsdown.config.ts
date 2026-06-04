import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/signals/index.ts", "src/dev-tools/index.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	dts: true,
	tsconfig: "tsconfig.lib.json",
	define: { DEBUG: String(process.env["SSV_DEBUG"] === "true") },
	outputOptions: {
		chunkFileNames: "_internal/[name].js",
	},
});
