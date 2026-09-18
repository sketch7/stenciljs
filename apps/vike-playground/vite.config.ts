import type { SerializeDocumentOptions, hydrateDocument, renderToString } from "@app/stencil-playground/hydrate";
import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

import { stencilSSRDevLogPlugin } from "./vite.plugins.stencil-ssr-dev-log.js";

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

	// In dev, activate SSV debug logging by default across all three execution contexts:
	//  1. Vite client bundle (@ssv/source imports): handled via `define.DEBUG` below.
	//  2. Hydrate module (Node.js SSR, same process): reads process.env.SSV_DEBUG at runtime.
	//  3. Browser custom elements (pre-built): inherits via preBuildCommand child process so
	//     tsdown bakes DEBUG="true" into stencil-core dist on the next lib rebuild.
	// Override selectively: SSV_DEBUG=transfer-state,query-hydration pnpm dev
	if (isDev) {
		process.env["SSV_DEBUG"] ??= "true";
	}

	return {
		define: {
			// In dev all SSV log categories are on by default.
			// Override selectively: SSV_DEBUG=transfer-state,query-hydration pnpm dev
			DEBUG: JSON.stringify(process.env["SSV_DEBUG"] ?? (isDev ? "true" : "false")),
		},
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			stencilSSRDevLogPlugin(path.basename(stencilPkgDir)),
			stencilWatch({
				apply: "serve",
				packageDir: stencilPkgDir,
				// NODE_ENV=development: disables minification (faster builds) and lets
				// rollupPlugins.before in stencil.config.ts bake DEBUG="true" into artifacts.
				buildCommand: "NODE_ENV=development pnpm stencil build",
				watchDirs: [
					path.resolve(__dirname, "../../libs/stencil-core/src"),
					path.resolve(__dirname, "../../libs/stencil-signals/src"),
					path.resolve(__dirname, "../../libs/stencil-ui/src"),
					path.resolve(__dirname, "../../libs/tanstack.stencil-query/src"),
					path.resolve(__dirname, "../../libs/tanstack.stencil-store/src"),
				],
				preBuildCommand:
					"pnpm nx run-many -t build --projects=stencil-core,stencil-signals,stencil-ui,tanstack-stencil-query,tanstack-stencil-store",
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
				// from: "@app/stencil-playground/react",
				hydrateModule: import("@app/stencil-playground/hydrate").then(m => {
					hydrateModuleRef = m as Record<string, unknown>;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return createHydrateProxy(isDev) as any;
				}),
				serializeShadowRoot: { default: "declarative-shadow-dom" },
			}),
		],

		resolve: {
			// In dev, use source files for @ssv/* packages so Vite's `define: { DEBUG: ... }`
			// actually takes effect. Without this, Vite loads pre-built dist files where DEBUG
			// is already replaced by tsdown, making the SSV_DEBUG env var ineffective.
			conditions: isDev ? ["@ssv/source"] : [],
			alias: [
				// In dev, redirect @app/stencil-playground/hydrate to the dev wrapper so that
				// renderToString is always called with runtimeLogging:true. This is needed because
				// @app/stencil-playground is SSR-externalized (Node.js resolves it directly),
				// so the @ssv/source export condition in package.json is ignored for SSR.
				// A resolve.alias fires before the SSR externalization check, so this wins.
				...(isDev
					? [
							{
								find: "@app/stencil-playground/hydrate",
								replacement: path.resolve(stencilPkgDir, "hydrate-dev.ts"),
							},
						]
					: []),
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
