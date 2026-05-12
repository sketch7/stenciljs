import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin, ViteDevServer } from "vite";

const execAsync = promisify(exec);

export type StencilWatchOptions = {
	/**
	 * Absolute path to the Stencil package directory.
	 * This is where the build command is executed and where the module-graph
	 * filter is applied to invalidate cached modules after a rebuild.
	 */
	packageDir: string;

	/**
	 * Absolute path to the Stencil source directory to watch.
	 * Defaults to `<packageDir>/src`.
	 */
	srcDir?: string;

	/**
	 * Subdirectory names (relative to `srcDir`) or absolute paths that Stencil
	 * writes back to after every build, such as generated framework wrappers.
	 * Changes inside these paths do NOT trigger a new build, preventing an
	 * infinite rebuild loop.
	 *
	 * Defaults to `["react", "vue", "angular"]`.
	 */
	generatedDirs?: string[];

	/**
	 * Shell command used to build the Stencil package.
	 * Defaults to `"pnpm stencil build"`.
	 */
	buildCommand?: string;

	/**
	 * String used to identify Vite module-graph entries that belong to the
	 * Stencil package. After a rebuild, every cached module whose ID contains
	 * this string is invalidated so Vite fetches fresh artefacts on the next
	 * request.
	 *
	 * Defaults to `path.basename(packageDir)`.
	 */
	packageId?: string;
};

/**
 * Vite plugin that watches a Stencil package's source directory and
 * re-runs the Stencil build on any user-authored file change, then
 * invalidates the Vite module graph and triggers a full page reload.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import path from "node:path";
 * import { stencilWatch } from "@ssv/vite-plugin-stencil-watch";
 *
 * export default defineConfig({
 *   plugins: [
 *     stencilWatch({
 *       packageDir: path.resolve(__dirname, "../my-stencil-lib"),
 *     }),
 *   ],
 * });
 * ```
 */
export function stencilWatch(options: StencilWatchOptions): Plugin {
	const {
		packageDir,
		srcDir: srcDirOption,
		generatedDirs = ["react", "vue", "angular"],
		buildCommand = "pnpm stencil build",
		packageId,
	} = options;

	const srcDir = path.normalize(srcDirOption ?? path.join(packageDir, "src"));
	const resolvedPackageId = packageId ?? path.basename(packageDir);

	const excludedDirs = generatedDirs.map(d =>
		path.isAbsolute(d) ? path.normalize(d) : path.normalize(path.join(srcDir, d)),
	);

	const isUserFile = (file: string): boolean => {
		const f = path.normalize(file);
		return f.startsWith(srcDir) && !f.endsWith(".d.ts") && excludedDirs.every(excluded => !f.startsWith(excluded));
	};

	let building = false;
	let pending = false;

	async function build(server: ViteDevServer): Promise<void> {
		if (building) {
			pending = true;
			return;
		}
		building = true;
		server.config.logger.info("[stencil] rebuilding…", { timestamp: true });
		try {
			await execAsync(buildCommand, { cwd: packageDir });
			server.config.logger.info("[stencil] rebuild done", { timestamp: true });
			// Invalidate every cached module from the Stencil package so Vite
			// fetches the fresh build artefacts on the next request.
			for (const mod of server.moduleGraph.idToModuleMap.values()) {
				if (mod.id?.includes(resolvedPackageId)) {
					server.moduleGraph.invalidateModule(mod);
				}
			}
			server.ws.send({ type: "full-reload" });
		} catch (error) {
			server.config.logger.error(`[stencil] rebuild failed:\n${(error as Error).message}`);
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
			server.watcher.add(srcDir);
			server.watcher.on("change", file => {
				if (isUserFile(file)) {
					build(server);
				}
			});
			server.watcher.on("add", file => {
				if (isUserFile(file)) {
					build(server);
				}
			});
			server.watcher.on("unlink", file => {
				if (isUserFile(file)) {
					build(server);
				}
			});
		},
	};
}
