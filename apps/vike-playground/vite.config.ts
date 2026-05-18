import type { SerializeDocumentOptions, hydrateDocument, renderToString } from "@app/stencil-playground/hydrate";
import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

const stencilPkgDir = path.resolve(__dirname, "../stencil-playground");

// Mutable reference to the current Stencil hydrate module.
// Updated after each Stencil rebuild so @stencil/ssr always server-renders
// with the latest artefacts instead of the stale module it resolved at startup.
let hydrateModuleRef: Record<string, unknown> = {};

type HydrateFn = typeof renderToString | typeof hydrateDocument;

// Wraps a hydrate function to forward component logs to the Node.js console.
const withRuntimeLogging = <T extends HydrateFn>(fn: T): T =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	((input: any, options?: SerializeDocumentOptions) =>
		(fn as typeof renderToString)(input, {
			runtimeLogging: true,
			...options,
		})) as unknown as T;

// Proxy that delegates every property access to hydrateModuleRef.
// Passed as hydrateModule to stencilSSR — @stencil/ssr caches the resolved
// Promise value, but because it's this proxy the cached value always forwards
// to the current hydrateModuleRef.
const hydrateProxy = new Proxy({} as Record<string, unknown>, {
	get(_, prop) {
		if (typeof prop === "symbol") {
			return null;
		}
		// Prevent the proxy from being treated as a thenable.
		if (prop === "then" || prop === "catch" || prop === "finally") {
			return null;
		}

		const value = (hydrateModuleRef as Record<string, unknown>)[prop];

		// Apply runtime logging to hydrate functions.
		if ((prop === "renderToString" || prop === "hydrateDocument") && typeof value === "function") {
			return withRuntimeLogging(value as HydrateFn);
		}

		return value;
	},
});

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const port = Number.parseInt(env["PORT"] ?? "3000", 10);

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			stencilWatch({
				packageDir: stencilPkgDir,
				watchDirs: [path.resolve(__dirname, "../../libs/stencil.core/src")],
				preBuildCommand: "pnpm nx run stencil-core:build",
				preBuildCommandCwd: path.resolve(__dirname, "../.."),
				onRebuildDone: async server => {
					// Reload the hydrate module through Vite's SSR pipeline so the
					// proxy picks up the freshly rebuilt artefacts before the
					// browser full-reload triggers the next SSR request.
					hydrateModuleRef = await server.ssrLoadModule("@app/stencil-playground/hydrate");
				},
			}),
			stencilSSR({
				module: import("@app/stencil-playground/react"),
				from: "@app/stencil-playground/react",
				// Resolve to hydrateProxy so @stencil/ssr always uses the current
				// _hydrateModule, not the one that was resolved at startup.
				hydrateModule: import("@app/stencil-playground/hydrate").then(m => {
					hydrateModuleRef = m as Record<string, unknown>;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return hydrateProxy as any;
				}),
				serializeShadowRoot: { default: "declarative-shadow-dom" },
			}),
		],
		resolve: {
			alias: [
				{
					find: "@/",
					replacement: `${path.resolve(__dirname, "./src")}/`,
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
