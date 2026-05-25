import { execSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { build } from "vite";
import type { InlineConfig } from "vite";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const libsDir = join(rootDir, "libs");

// Always-external: provided by the host Stencil app, never bundled.
const HOST_EXTERNALS = new Set(["@stencil/core"]);

const SKIP_EXPORT_SEGMENTS = new Set(["testing", "dev"]);

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} kB`;
	}
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

type PkgJson = {
	name: string;
	exports?: Record<string, unknown>;
	peerDependencies?: Record<string, string>;
};

function resolveImportPath(condition: unknown): string | null {
	if (typeof condition === "string") {
		return condition.endsWith(".js") ? condition : null;
	}
	if (typeof condition !== "object" || condition === null) {
		return null;
	}
	const obj = condition as Record<string, unknown>;
	return resolveImportPath(obj["import"] ?? obj["default"] ?? null);
}

type SizeResult = {
	raw: number;
	gzip: number;
	brotli: number;
};

function isExternal(id: string, externals: Set<string>): boolean {
	return externals.has(id) || [...externals].some(e => id.startsWith(`${e}/`));
}

async function measureEntry(entryFile: string, external: (id: string) => boolean): Promise<SizeResult> {
	const config: InlineConfig = {
		root: rootDir,
		configFile: false,
		build: {
			write: false,
			minify: "oxc",
			rollupOptions: {
				input: entryFile,
				external,
				output: { format: "esm" },
				treeshake: true,
			},
		},
		logLevel: "silent",
	};

	const result = await build(config);
	const output = (Array.isArray(result) ? result[0] : result) as { output: { type: string; code?: string }[] };
	const code = output.output
		.filter(c => c.type === "chunk")
		.map(c => c.code ?? "")
		.join("\n");

	const buf = Buffer.from(code);
	return {
		raw: buf.length,
		gzip: gzipSync(buf, { level: 9 }).length,
		brotli: brotliCompressSync(buf).length,
	};
}

type LibConfig = {
	dir: string;
	/** Override the display name shown in the table. */
	label?: string;
	/** Keep these extra ids external during the +peers measurement. */
	peerExternal?: string[];
	/** Skip these export keys for this config (e.g. to isolate a signal flavor). */
	skipExports?: string[];
};

// Ordered so deps appear before dependents.
// stencil-signals runs twice: once per signal implementation flavor.
const LIB_ORDER: LibConfig[] = [
	{ dir: "stencil-core" },
	{
		dir: "stencil-signals",
		label: "@ssv/stencil-signals [tc39]",
		peerExternal: ["@preact/signals-core"],
		skipExports: ["./preact"],
	},
	{
		dir: "stencil-signals",
		label: "@ssv/stencil-signals [preact]",
		peerExternal: ["signal-polyfill"],
		skipExports: ["./tc39"],
	},
	{ dir: "stencil-ui" },
	{ dir: "tanstack.stencil-store" },
	{ dir: "tanstack.stencil-query" },
];

type EntryRow = {
	lib: string;
	export: string;
	self: SizeResult;
	total: SizeResult;
	peerDeps: string;
};

type LibRow = {
	lib: string;
	self: SizeResult;
	total: SizeResult;
	peerDeps: string;
};

const entryRows: EntryRow[] = [];
// Accumulate raw numbers for grouping, keyed by display label.
const libTotals = new Map<string, { self: SizeResult; withPeers: SizeResult; peers: string }>();

for (const cfg of LIB_ORDER) {
	const libDir = join(libsDir, cfg.dir);
	let pkg: PkgJson;
	try {
		pkg = JSON.parse(readFileSync(join(libDir, "package.json"), "utf8")) as PkgJson;
	} catch {
		continue;
	}

	const label = cfg.label ?? pkg.name;
	const peerDeps = Object.keys(pkg.peerDependencies ?? {});
	const displayPeerDeps = peerDeps.filter(p => !(cfg.peerExternal ?? []).includes(p));
	const allPeerIds = new Set([...peerDeps, ...HOST_EXTERNALS, ...(cfg.peerExternal ?? [])]);
	// For +peers: keep HOST_EXTERNALS + scenario-specific externals out.
	const withPeersExternalIds = new Set([...HOST_EXTERNALS, ...(cfg.peerExternal ?? [])]);

	for (const [exportKey, condition] of Object.entries(pkg.exports ?? {})) {
		const segments = exportKey.split("/").slice(1);
		if (segments.some(s => SKIP_EXPORT_SEGMENTS.has(s))) {
			continue;
		}
		if (exportKey.includes("*")) {
			continue;
		}
		if (cfg.skipExports?.includes(exportKey)) {
			continue;
		}

		const rel = resolveImportPath(condition);
		if (!rel) {
			continue;
		}

		const abs = join(libDir, rel);
		try {
			statSync(abs);
		} catch {
			console.warn(`  missing: ${pkg.name} ${exportKey} → ${rel}`);
			continue;
		}

		process.stdout.write(`  ${label} ${exportKey} ...`);

		const selfExternal = (id: string) => isExternal(id, allPeerIds);
		const withPeersExternal = (id: string) => isExternal(id, withPeersExternalIds);

		const [self, withPeers] = await Promise.all([
			measureEntry(abs, selfExternal),
			measureEntry(abs, withPeersExternal),
		]);

		process.stdout.write(" ✓\n");

		const existing = libTotals.get(label);
		libTotals.set(label, {
			self: {
				raw: (existing?.self.raw ?? 0) + self.raw,
				gzip: (existing?.self.gzip ?? 0) + self.gzip,
				brotli: (existing?.self.brotli ?? 0) + self.brotli,
			},
			withPeers: {
				raw: (existing?.withPeers.raw ?? 0) + withPeers.raw,
				gzip: (existing?.withPeers.gzip ?? 0) + withPeers.gzip,
				brotli: (existing?.withPeers.brotli ?? 0) + withPeers.brotli,
			},
			peers: displayPeerDeps.join(", ") || "—",
		});

		entryRows.push({
			lib: label,
			export: exportKey,
			self,
			total: withPeers,
			peerDeps: displayPeerDeps.join(", ") || "—",
		});
	}
}

const libRows: LibRow[] = [...libTotals.entries()].map(([lib, t]) => ({
	lib,
	self: t.self,
	total: t.withPeers,
	peerDeps: t.peers,
}));

function sizeCell(s: SizeResult, cls: string): string {
	return `<td class="${cls}" data-gz="${formatBytes(s.gzip)}" data-br="${formatBytes(s.brotli)}" data-raw="${formatBytes(s.raw)}">${formatBytes(s.gzip)}</td>`;
}

function htmlTable(rows: (LibRow | EntryRow)[], withExport: boolean): string {
	if (rows.length === 0) {
		return "<p>No data.</p>";
	}
	const exportCol = withExport ? "<th>export</th>" : "";
	const header = `<tr><th>lib</th>${exportCol}<th>self</th><th>peers</th><th>total</th><th>peer deps</th></tr>`;
	const trs = rows
		.map(r => {
			const peersOnly: SizeResult = {
				raw: r.total.raw - r.self.raw,
				gzip: Math.max(0, r.total.gzip - r.self.gzip),
				brotli: Math.max(0, r.total.brotli - r.self.brotli),
			};
			const exportTd = withExport ? `<td>${(r as EntryRow).export}</td>` : "";
			return `<tr><td>${r.lib}</td>${exportTd}${sizeCell(r.self, "c-self")}${sizeCell(peersOnly, "c-peers")}${sizeCell(r.total, "c-total")}<td class="c-deps">${r.peerDeps}</td></tr>`;
		})
		.join("");
	return `<table><thead>${header}</thead><tbody>${trs}</tbody></table>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bundle Cost — @ssv libs</title>
<style>
  :root { color-scheme: dark light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 14px/1.6 system-ui, sans-serif; padding: 2rem; background: #0f1117; color: #e2e8f0; }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; color: #f8fafc; }
  .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; }
  .toolbar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; }
  .switcher { display: flex; border: 1px solid #334155; border-radius: 6px; overflow: hidden; }
  .switcher button { padding: 0.3rem 0.9rem; font: inherit; font-size: 0.8rem; background: transparent; color: #94a3b8; border: none; cursor: pointer; transition: background .15s, color .15s; }
  .switcher button.active { background: #334155; color: #f1f5f9; font-weight: 600; }
  h2 { font-size: 1rem; font-weight: 600; margin: 2rem 0 0.4rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
  .legend { font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem; }
  .legend b { color: #cbd5e1; }
  table { border-collapse: collapse; width: 100%; font-size: 0.82rem; margin-bottom: 2rem; }
  thead tr { background: #1e293b; }
  th { padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; color: #94a3b8; white-space: nowrap; border-bottom: 1px solid #334155; }
  td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #1e293b; white-space: nowrap; }
  tbody tr:hover { background: #1e293b88; }
  td.c-self { color: #34d399; font-weight: 500; }
  td.c-peers { color: #94a3b8; }
  td.c-total { color: #fb923c; font-weight: 500; }
  td.c-deps { color: #64748b; white-space: normal; font-size: 0.75rem; }
</style>
</head>
<body>
<h1>Bundle Cost — @ssv libs</h1>
<p class="meta">Generated ${new Date().toLocaleString()} · minified + treeshaken via Vite/esbuild</p>
<div class="toolbar">
  <div class="switcher">
    <button class="active" onclick="setMode('gz')">gzip</button>
    <button onclick="setMode('br')">brotli</button>
    <button onclick="setMode('raw')">raw</button>
  </div>
</div>

<h2>Per-lib totals (all exports summed)</h2>
<div class="legend">
  <b>self</b> = lib code only, all peer deps provided by host &nbsp;·&nbsp;
  <b>peers</b> = cost of non-Stencil peer deps &nbsp;·&nbsp;
  <b>total</b> = self + peers
</div>
${htmlTable(libRows, false)}

<h2>Per export entry</h2>
<div class="legend">Each public export entry point measured independently.</div>
${htmlTable(entryRows, true)}

<script>
function setMode(m) {
  const labels = { gz: 'gzip', br: 'brotli', raw: 'raw' };
  document.querySelectorAll('.switcher button').forEach(b => b.classList.toggle('active', b.textContent === labels[m]));
  document.querySelectorAll('td[data-gz]').forEach(td => { td.textContent = td.dataset[m]; });
}
</script>
</body></html>`;

const outFile = join(rootDir, "dist", "bundle-cost.html");
try {
	execSync(`mkdir -p "${join(rootDir, "dist")}"`);
} catch {}
writeFileSync(outFile, html, "utf8");
console.log(`\n  report → ${outFile}`);
execSync(`open "${outFile}"`);

console.log("\n── Bundle cost per lib ──────────────────────────────────────────────────────────");
console.table(
	libRows.map(r => ({
		lib: r.lib,
		self·gz: formatBytes(r.self.gzip),
		peers·gz: formatBytes(Math.max(0, r.total.gzip - r.self.gzip)),
		total·gz: formatBytes(r.total.gzip),
		peerDeps: r.peerDeps,
	})),
);

console.log("\n── Bundle cost per export entry ────────────────────────────────────────────────");
console.table(
	entryRows.map(r => ({
		lib: r.lib,
		export: r.export,
		self·gz: formatBytes(r.self.gzip),
		peers·gz: formatBytes(Math.max(0, r.total.gzip - r.self.gzip)),
		total·gz: formatBytes(r.total.gzip),
	})),
);
