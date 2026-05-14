import { defineConfig } from "vitest/config";

// NOTE: stencil.core integration tests require a prior Stencil build.
// Run `pnpm nx run stencil.core:test` at least once before running
// integration tests from the VS Code Testing panel.
export default defineConfig({
	test: {
		projects: [
			"./libs/tanstack.stencil-store/vitest.config.ts",
			"./libs/stencil.core/vitest.unit.config.ts",
			"./libs/stencil.core/vitest.integration.config.ts",
		],
	},
});
