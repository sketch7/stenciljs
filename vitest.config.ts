import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"./libs/tanstack.stencil-store/vitest.config.ts",
			"./libs/stencil.core/vitest.unit.config.ts",
			"./libs/stencil.core/vitest.integration.config.ts",
		],
	},
});
