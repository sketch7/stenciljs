import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	const port = parseInt(env["PORT"] ?? "3000", 10);

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			// Compile-time SSR for @ssv/stencil-playground components.
			// The plugin intercepts JSX references to the react wrappers,
			// calls the hydrate module, and replaces them with pre-rendered
			// Declarative Shadow DOM so components are server-rendered.
			stencilSSR({
				module: import("@ssv/stencil-playground/react"),
				from: "@ssv/stencil-playground/react",
				hydrateModule: import("@ssv/stencil-playground/hydrate"),
				serializeShadowRoot: { default: "declarative-shadow-dom" },
			}),
		],
		resolve: {
			alias: [
				{
					find: "@/",
					replacement: path.resolve(__dirname, "./src") + "/",
				},
			],
		},
		server: {
			port,
		},
		preview: {
			port,
		},
		build: {
			target: "esnext",
		},
	};
});
