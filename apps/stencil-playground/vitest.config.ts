import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@app/stencil-playground",
		environment: "jsdom",
		include: ["src/**/*.{spec,test}.ts"],
		passWithNoTests: true,
	},
});
