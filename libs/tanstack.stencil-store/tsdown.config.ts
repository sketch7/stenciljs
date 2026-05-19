import { defineConfig } from "tsdown";

export default defineConfig({
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
});
