import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

const stencilPkgDir = path.resolve(__dirname, "../stencil-playground");

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	const port = parseInt(env["PORT"] ?? "3000", 10);

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			stencilWatch({ packageDir: stencilPkgDir }),
			stencilSSR({
				module: import("@app/stencil-playground/react"),
				from: "@app/stencil-playground/react",
				hydrateModule: import("@app/stencil-playground/hydrate"),
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
		optimizeDeps: {
			exclude: [
				"@app/stencil-playground",
				"@app/stencil-playground/react",
				"@app/stencil-playground/hydrate",
				"@app/stencil-playground/loader",
				"@app/stencil-playground/custom-elements",
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
