import { defineVitestConfig } from "@stencil/vitest/config";

export default defineVitestConfig({
	stencilConfig: "./stencil.config.ts",
	test: {
		projects: [
			{
				test: {
					name: "unit",
					include: ["src/**/*.{spec,test}.ts"],
					environment: "node",
					coverage: {
						provider: "v8",
						include: ["src/**/*.ts"],
						exclude: ["src/**/*.{spec,test}.ts"],
					},
				},
			},
			{
				test: {
					name: "integration",
					include: ["tests/**/*.spec.tsx"],
					environment: "stencil",
					setupFiles: ["./vitest-setup.ts"],
				},
			},
		],
	},
});
