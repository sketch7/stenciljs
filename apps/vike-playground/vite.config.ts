import type { SerializeDocumentOptions, hydrateDocument, renderToString } from "@app/stencil-playground/hydrate";
import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

function packageSizeReporter(): Plugin {
	return {
		name: "package-size-reporter",
		generateBundle(_, bundle) {
			const sizes = new Map<string, number>();
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "chunk") {
					continue;
				}
				for (const [id, mod] of Object.entries(chunk.modules)) {
					const pkg = resolvePackageName(id);
					sizes.set(pkg, (sizes.get(pkg) ?? 0) + mod.renderedLength);
				}
			}
			const rows = [...sizes.entries()]
				.toSorted((a, b) => b[1] - a[1])
				.map(([pkg, bytes]) => ({ pkg, size: formatBytes(bytes) }));
			console.table(rows);
		},
	};
}

function resolvePackageName(id: string): string {
	// pnpm stores packages as: /node_modules/.pnpm/<encoded>/node_modules/<pkg>/...
	// Split on all node_modules segments and take the last non-virtual one.
	const nmParts = id.split(/[/]node_modules[/]/);
	if (nmParts.length > 1) {
		const last = nmParts.at(-1).match(/^(@[^/]+[/][^/]+|[^/]+)/);
		if (last && !last[1].startsWith(".")) {
			return last[1];
		}
	}
	// workspace libs resolve via @ssv/source condition to libs/<name>/src/...
	const lib = id.match(/[/]libs[/]([^/]+)[/]/);
	if (lib) {
		return `@ssv/${lib[1]}`;
	}
	const app = id.match(/[/]apps[/]([^/]+)[/]/);
	if (app) {
		return `@app/${app[1]}`;
	}
	return "(other)";
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} kB`;
	}
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const stencilPkgDir = path.resolve(__dirname, "../stencil-playground");

// Mutable reference to the current Stencil hydrate module.
// Updated after each Stencil rebuild so @stencil/ssr always server-renders
// with the latest artifacts instead of the stale module it resolved at startup.
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

const createHydrateProxy = (enableRuntimeLogging: boolean) =>
	new Proxy({} as Record<string, unknown>, {
		get(_, prop) {
			if (typeof prop === "symbol") {
				return null;
			}
			// Prevent the proxy from being treated as a thenable.
			if (prop === "then" || prop === "catch" || prop === "finally") {
				return null;
			}

			const value = (hydrateModuleRef as Record<string, unknown>)[prop];

			// Apply runtime logging to hydrate functions in dev only.
			if (
				enableRuntimeLogging &&
				(prop === "renderToString" || prop === "hydrateDocument") &&
				typeof value === "function"
			) {
				return withRuntimeLogging(value as HydrateFn);
			}

			return value;
		},
	});

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const port = Number.parseInt(env["PORT"] ?? "3100", 10);
	const isDev = command === "serve";
	const isAnalyze = env["ANALYZE"] === "true";

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			stencilWatch({
				apply: "serve",
				packageDir: stencilPkgDir,
				watchDirs: [path.resolve(__dirname, "../../libs/stencil.core/src")],
				preBuildCommand: "pnpm nx run stencil-core:build",
				preBuildCommandCwd: path.resolve(__dirname, "../.."),
				onRebuildDone: async server => {
					// Reload the hydrate module through Vite's SSR pipeline so the
					// proxy picks up the freshly rebuilt artifacts before the
					// browser full-reload triggers the next SSR request.
					hydrateModuleRef = await server.ssrLoadModule("@app/stencil-playground/hydrate");
				},
			}),
			...(isAnalyze
				? [
						visualizer({
							open: true,
							gzipSize: true,
							brotliSize: true,
							filename: "dist/stats.html",
						}),
						packageSizeReporter(),
					]
				: []),
			stencilSSR({
				// Keep @stencil/ssr configured while runtime rendering is provided
				// by the generated server wrappers selected via package export
				// conditions.
				module: import("@app/stencil-playground/react"),
				from: "@app/stencil-playground/react/server",
				hydrateModule: import("@app/stencil-playground/hydrate").then(m => {
					hydrateModuleRef = m as Record<string, unknown>;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return createHydrateProxy(isDev) as any;
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
			...(isDev
				? {}
				: {
						sourcemap: isAnalyze,
						minify: true,
						cssMinify: true,
					}),
		},
	};
});
