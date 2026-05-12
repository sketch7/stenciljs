import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@ssv/tanstack.stenciljs-store",
		environment: "node",
		include: ["src/**/*.{spec,test}.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.{spec,test}.ts"],
		},
	},
});
