import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/testing/index.ts",
		"src/testing/dom/index.ts",
		"src/transfer-state/index.ts",
		"src/dev/index.ts",
		"src/dom/index.ts",
	],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	dts: true,
	tsconfig: "tsconfig.lib.json",
	// Replace DEBUG with `false` at build time so the bundler can fold away all
	// logging branches (createContextLogger returns noop → entire log(...) calls
	// become dead code and are removed).
	define: { DEBUG: JSON.stringify(process.env["SSV_DEBUG"] ?? "false") },
	outputOptions: {
		chunkFileNames: "_internal/[name].js",
	},
});
