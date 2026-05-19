import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Rollup `external` predicate that externalizes every package in the given
 * package's `peerDependencies` (and their subpath imports), so peer deps are
 * never bundled into the Stencil output. Mirrors tsdown's default behaviour of
 * externalizing `peerDependencies` for the Stencil compiler.
 *
 * `@stencil/core` is excluded by default — use `externalRuntime: true` on the
 * `dist-custom-elements` target for the Stencil runtime instead (it scopes
 * correctly without touching the self-contained `dist-hydrate-script`).
 *
 * @param pkgDir Directory containing package.json. Defaults to `process.cwd()`,
 *   which is the project dir when `stencil build` runs via its Nx target.
 */
export function externalizePeerDeps(
	pkgDir: string = process.cwd(),
	{ exclude = ["@stencil/core"] }: { exclude?: string[] } = {},
): (source: string) => boolean {
	const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
		peerDependencies?: Record<string, string>;
	};
	const peers = Object.keys(pkg.peerDependencies ?? {}).filter(name => !exclude.includes(name));
	return (source: string): boolean => peers.some(name => source === name || source.startsWith(`${name}/`));
}
