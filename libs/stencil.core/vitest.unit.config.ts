import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "stencil.core/unit",
		include: ["src/**/*.{spec,test}.ts"],
		environment: "node",
	},
});
