import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
});
