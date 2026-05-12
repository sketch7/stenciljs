import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import vike from "vike/plugin";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

const execAsync = promisify(exec);

const stencilSrcDir = path.normalize(path.resolve(__dirname, "../stencil-playground/src"));
const stencilPkgDir = path.resolve(__dirname, "../stencil-playground");
// Stencil writes back to src/react/ and src/components.d.ts — ignore those to avoid an infinite rebuild loop.
const stencilGenDir = path.normalize(path.resolve(__dirname, "../stencil-playground/src/react"));
const isUserFile = (file: string) => {
	const f = path.normalize(file);
	return f.startsWith(stencilSrcDir) && !f.startsWith(stencilGenDir) && !f.endsWith(".d.ts");
};

/** Watches stencil source files and triggers a prod rebuild + full page reload on change. */
function stencilWatchPlugin(): Plugin {
	let building = false;
	let pending = false;

	async function build(server: ViteDevServer) {
		if (building) {
			pending = true;
			return;
		}
		building = true;
		server.config.logger.info("[stencil] rebuilding…", { timestamp: true });
		try {
			await execAsync("pnpm stencil build", { cwd: stencilPkgDir });
			server.config.logger.info("[stencil] rebuild done", { timestamp: true });
			// Invalidate every cached module from the stencil package so Vite
			// fetches the fresh build artifacts on the next request.
			for (const mod of server.moduleGraph.idToModuleMap.values()) {
				if (mod.id?.includes("stencil-playground")) {
					server.moduleGraph.invalidateModule(mod);
				}
			}
			server.ws.send({ type: "full-reload" });
		} catch (err) {
			server.config.logger.error(`[stencil] rebuild failed:\n${(err as Error).message}`);
		} finally {
			building = false;
			if (pending) {
				pending = false;
				await build(server);
			}
		}
	}

	return {
		name: "stencil-watch",
		apply: "serve",
		configureServer(server) {
			server.watcher.add(stencilSrcDir);
			server.watcher.on("change", (file) => { if (isUserFile(file)) build(server); });
			server.watcher.on("add", (file) => { if (isUserFile(file)) build(server); });
			server.watcher.on("unlink", (file) => { if (isUserFile(file)) build(server); });
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	const port = parseInt(env["PORT"] ?? "3000", 10);

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			stencilWatchPlugin(),
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
