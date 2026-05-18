import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// Prefer workspace `exports["@ssv/source"]` so tests don’t depend on built `dist/` peers.
		conditions: ["@ssv/source", "import", "module", "default"],
	},
	test: {
		name: "@ssv/stencil-signals",
		environment: "node",
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.{spec,test}.ts"],
		},
	},
});
