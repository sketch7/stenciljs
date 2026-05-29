import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/extensions.ts", "src/signal-store.ts", "src/tc39.ts", "src/preact.ts"],
	format: ["esm"],
	platform: "neutral",
	hash: false,
	tsconfig: "tsconfig.lib.json",
});
