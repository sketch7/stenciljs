import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/testing/index.ts",
		"src/testing/dom/index.ts",
		"src/transfer-state/index.ts",
		"src/dev/index.ts",
	],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
});
