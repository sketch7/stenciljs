// oxlint-disable max-statements
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

	/**
	 * Additional source directories to watch. Changes in these directories also
	 * trigger a Stencil rebuild AND the `preBuildCommand`. Use this to watch
	 * workspace peer-dependency sources (e.g. `libs/stencil.core/src`) so the
	 * dependency is rebuilt before Stencil bundles it.
	 *
	 * Changes in `srcDir` (the main Stencil source) do NOT run `preBuildCommand` —
	 * only changes in these extra watch directories do, avoiding redundant work.
	 */
	watchDirs?: string[];

	/**
	 * Optional command to run before the main Stencil build command.
	 * Only executed when the triggering file came from `watchDirs` (not from
	 * `srcDir`), so peer dependencies are only rebuilt when their own sources change.
	 *
	 * Prefer an Nx-based command (e.g. `"pnpm nx run stencil-core:build"`) so
	 * Nx's output cache makes it nearly instant on a cache hit.
	 */
	preBuildCommand?: string;

	/**
	 * Working directory for `preBuildCommand`.
	 * Defaults to `packageDir`. Set this to the monorepo workspace root when
	 * using Nx commands so that `nx.json` can be resolved.
	 *
	 * @example
	 * ```ts
	 * preBuildCommandCwd: path.resolve(__dirname, "../.."), // workspace root
	 * ```
	 */
	preBuildCommandCwd?: string;

	/**
	 * Milliseconds to wait after the last file-change event before starting a
	 * build. Batches rapid saves (e.g. format-on-save touching multiple files)
	 * into a single rebuild.
	 *
	 * Defaults to `100`.
	 */
	debounceMs?: number;

	/**
	 * Optional async callback invoked after a successful Stencil rebuild, once
	 * all Vite module graphs have been invalidated but **before** the browser
	 * full-reload is sent.
	 *
	 * Use this to refresh in-process module references that bypass the Vite
	 * module graph. The primary use-case is refreshing a `hydrateModule` proxy
	 * used by `@stencil/ssr` so that server-side rendering picks up the rebuilt
	 * artefacts on the next request.
	 *
	 * @example
	 * ```ts
	 * onRebuildDone: async server => {
	 *   hydrateRef = await server.ssrLoadModule("@my-pkg/hydrate");
	 * },
	 * ```
	 */
	onRebuildDone?: (server: ViteDevServer) => void | Promise<void>;
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
		watchDirs = [],
		preBuildCommand,
		preBuildCommandCwd,
		debounceMs = 100,
		onRebuildDone,
	} = options;

	const srcDir = path.normalize(srcDirOption ?? path.join(packageDir, "src"));
	const resolvedPackageId = packageId ?? path.basename(packageDir);
	const resolvedWatchDirs = watchDirs.map(d => path.normalize(d));

	const excludedDirs = generatedDirs.map(d =>
		path.isAbsolute(d) ? path.normalize(d) : path.normalize(path.join(srcDir, d)),
	);

	const isUserFile = (file: string): boolean => {
		const f = path.normalize(file);
		if (f.endsWith(".d.ts")) {
			return false;
		}
		if (f.startsWith(srcDir) && excludedDirs.every(excluded => !f.startsWith(excluded))) {
			return true;
		}
		return resolvedWatchDirs.some(d => f.startsWith(d));
	};

	/** Returns true when the file lives inside one of the extra `watchDirs`. */
	const isWatchDirFile = (file: string): boolean => {
		const f = path.normalize(file);
		return resolvedWatchDirs.some(d => f.startsWith(d));
	};

	let building = false;
	/**
	 * SSR module IDs whose source (pre-transform) contains an import from the
	 * stencil package. Populated by the transform hook and used in build() to
	 * invalidate these modules even when @stencil/ssr or similar plugins remove
	 * the import from the transformed code, breaking the importer chain in
	 * Vite's SSR module graph.
	 */
	const stencilImporterIds = new Set<string>();

	/** Whether a build is queued to run after the current one finishes. */
	let pending = false;
	/**
	 * Accumulated flag across the debounce window (and any queued pending build)
	 * tracking whether the next build needs to run `preBuildCommand`.
	 * Set when a changed file originates from `watchDirs`; cleared after each build starts.
	 */
	let pendingNeedsPreBuild = false;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	/** Schedule a build with debounce, accumulating the preBuild need. */
	function trigger(server: ViteDevServer, needsPreBuild: boolean): void {
		if (needsPreBuild) {
			pendingNeedsPreBuild = true;
		}
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			const withPreBuild = pendingNeedsPreBuild;
			pendingNeedsPreBuild = false;
			build(server, withPreBuild);
		}, debounceMs);
	}

	async function build(server: ViteDevServer, needsPreBuild: boolean): Promise<void> {
		if (building) {
			// Accumulate preBuild need for the queued run.
			if (needsPreBuild) {
				pendingNeedsPreBuild = true;
			}
			pending = true;
			return;
		}
		building = true;
		const label = needsPreBuild ? "[stencil] rebuilding (with pre-build)…" : "[stencil] rebuilding…";
		server.config.logger.info(label, { timestamp: true });
		try {
			if (preBuildCommand && needsPreBuild) {
				await execAsync(preBuildCommand, { cwd: preBuildCommandCwd ?? packageDir });
			}
			await execAsync(buildCommand, { cwd: packageDir });
			server.config.logger.info("[stencil] rebuild done", { timestamp: true });
			// Invalidate every cached module that belongs to the Stencil package.
			// For the SSR environment we also walk up the importer chain (BFS) so
			// that page-level modules (e.g. Vike's +Page.tsx) which transitively
			// import rebuilt artifacts are also re-evaluated on the next request —
			// without this the cached page module continues to serve stale SSR HTML.
			// For the client environment a direct invalidation is sufficient because
			// the subsequent full-reload causes the browser to re-fetch everything.
			for (const [envName, env] of Object.entries(server.environments)) {
				const seen = new Set<string>();
				const queue = [...env.moduleGraph.idToModuleMap.values()].filter(m => m.id?.includes(resolvedPackageId));
				let qi = 0;
				while (qi < queue.length) {
					const mod = queue[qi++];
					const key = mod.id ?? mod.url;
					if (!key || seen.has(key)) {
						continue;
					}
					seen.add(key);
					env.moduleGraph.invalidateModule(mod);
					// SSR only: walk up the importer chain so page-level modules
					// (e.g. +Page.tsx) are also invalidated and re-evaluated on the
					// next request. Client full-reload makes this unnecessary there.
					if (envName !== "ssr") {
						continue;
					}
					for (const importer of mod.importers) {
						queue.push(importer);
					}
				}
			}
			// Additionally invalidate SSR modules tracked by the transform hook.
			// @stencil/ssr and similar plugins remove the stencil import from the
			// transformed output, breaking the BFS importer chain above so that
			// page modules (e.g. +Page.tsx) are never reached. The transform hook
			// records these modules before the import is stripped.
			const ssrEnv = server.environments["ssr"];
			if (ssrEnv) {
				for (const trackedId of stencilImporterIds) {
					const trackedMod = ssrEnv.moduleGraph.idToModuleMap.get(trackedId);
					if (trackedMod) {
						ssrEnv.moduleGraph.invalidateModule(trackedMod);
					}
				}
			}
			// Run the rebuild-done callback before triggering the browser reload so
			// any in-process module references (e.g. the @stencil/ssr hydrateModule)
			// are refreshed before the first SSR request arrives.
			if (onRebuildDone) {
				await onRebuildDone(server);
			}
			server.hot.send({ type: "full-reload" });
		} catch (error) {
			server.config.logger.error(`[stencil] rebuild failed:\n${(error as Error).message}`);
		} finally {
			building = false;
			if (pending) {
				const wasNeededPreBuild = pendingNeedsPreBuild;
				pending = false;
				pendingNeedsPreBuild = false;
				await build(server, wasNeededPreBuild);
			}
		}
	}

	return {
		name: "stencil-watch",
		apply: "serve",
		// Track SSR modules whose source code imports from the stencil package.
		// These modules cannot be found via the BFS importer walk because
		// @stencil/ssr removes the import from the transformed output, breaking
		// Vite's SSR module graph edges. We capture them here (on the source,
		// before any transform strips the import) so build() can invalidate them.
		transform(code, id, transformOptions) {
			if (
				transformOptions?.ssr &&
				!id.includes("node_modules") &&
				!id.includes(resolvedPackageId) &&
				code.includes(resolvedPackageId)
			) {
				stencilImporterIds.add(id);
			}
			return null;
		},
		configureServer(server) {
			server.watcher.add(srcDir);
			for (const d of resolvedWatchDirs) {
				server.watcher.add(d);
			}
			server.watcher.on("change", file => {
				if (isUserFile(file)) {
					trigger(server, isWatchDirFile(file));
				}
			});
			server.watcher.on("add", file => {
				if (isUserFile(file)) {
					trigger(server, isWatchDirFile(file));
				}
			});
			server.watcher.on("unlink", file => {
				if (isUserFile(file)) {
					trigger(server, isWatchDirFile(file));
				}
			});
		},
	};
}
