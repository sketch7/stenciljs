import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

// Resolve via the local node_modules symlink — works whether this file is
// loaded as a root config or as a project from the workspace root config.
const stencilEnv = fileURLToPath(new URL("node_modules/@stencil/vitest/dist/environments/stencil.js", import.meta.url));

export default defineProject({
	resolve: {
		conditions: ["@ssv/source", "import", "module", "default"],
	},
	environments: {
		ssr: {
			resolve: {
				conditions: ["@ssv/source", "import", "module", "default"],
			},
		},
	},
	test: {
		name: "stencil-core/integration",
		include: ["tests/**/*.spec.tsx"],
		environment: stencilEnv,
		setupFiles: ["./vitest-setup.ts"],
	},
});
