import type { Plugin } from "vite";

/**
 * Tracks SSR module IDs whose source imports from the Stencil package.
 * Shared between the tracking transform hook and the invalidation middleware.
 */
const stencilSSRPageIds = new Set<string>();

/**
 * Dev-only Vite plugin that forces the `@stencil/ssr` Vite transform to
 * re-run on every SSR request, so `runtimeLogging` fires on each page visit
 * instead of only on the first request after server start.
 *
 * Works by invalidating tracked SSR page modules after each response.
 * The next request finds no cached transform, re-runs `renderToString` via
 * the proxy (which injects `runtimeLogging: true`), and logs lifecycle hooks.
 */
export function stencilSSRDevLogPlugin(packageId: string): Plugin {
	return {
		name: "stencil:ssr:dev-rerender-log",
		apply: "serve",
		// Track SSR modules whose source imports from the Stencil package.
		// These are the page modules that @stencil/ssr transforms with
		// embedded pre-rendered HTML. We need to invalidate them per-request
		// so the transform (and its renderToString call) re-runs each time.
		transform(code, id, options) {
			if (options?.ssr && !id.includes("node_modules") && !id.includes(packageId) && code.includes(packageId)) {
				stencilSSRPageIds.add(id);
			}
			return null;
		},
		configureServer(server) {
			// Add middleware BEFORE Vike's middleware so we can attach finish
			// listeners before Vike handles each request.
			server.middlewares.use((_req, res, next) => {
				res.on("finish", () => {
					// After each response, invalidate the SSR transform cache
					// for page modules that use Stencil components. The next
					// request will re-run the @stencil/ssr transform, calling
					// renderToString with runtimeLogging: true via the proxy.
					const envs = server.environments as
						| Record<
								string,
								{ moduleGraph: { idToModuleMap: Map<string, unknown>; invalidateModule: (m: unknown) => void } }
						  >
						| undefined;
					if (!envs) {
						return;
					}
					for (const [, env] of Object.entries(envs)) {
						for (const id of stencilSSRPageIds) {
							const mod = env.moduleGraph.idToModuleMap.get(id);
							if (mod) {
								env.moduleGraph.invalidateModule(mod);
							}
						}
					}
				});
				next();
			});
		},
	};
}
