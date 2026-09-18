import type { LogLevel } from "@logtape/logtape";
import { configureSync, getConsoleSink } from "@logtape/logtape";

/** Per-feature log categories for the LoL draft simulator. */
export type LolLogCategory = "root" | "draft" | "draft-sse" | "drafts-sse" | "lobby" | "champion";

/** LogTape levels plus "off" to silence a category entirely. */
export type LolLogLevel = LogLevel | "off";

const STORAGE_PREFIX = "lol:log:";

const DEFAULTS: Record<LolLogCategory, LolLogLevel> = {
	root: "info",
	draft: "debug",
	"draft-sse": "debug",
	"drafts-sse": "debug",
	lobby: "debug",
	champion: "warning",
};

const CATEGORIES: Record<LolLogCategory, readonly string[]> = {
	root: ["lol"],
	draft: ["lol", "draft"],
	"draft-sse": ["lol", "draft", "sse"],
	"drafts-sse": ["lol", "draft", "drafts-sse"],
	lobby: ["lol", "lobby"],
	champion: ["lol", "champion"],
};

function readLevel(key: LolLogCategory): LolLogLevel {
	try {
		return (localStorage.getItem(STORAGE_PREFIX + key) as LolLogLevel | null) ?? DEFAULTS[key];
	} catch {
		return DEFAULTS[key];
	}
}

type LoggerEntry =
	| { category: string[]; sinks: "console"[]; parentSinks: "override"; lowestLevel: "fatal" }
	| { category: string[]; sinks: "console"[]; parentSinks: "override"; lowestLevel: LogLevel }
	| { category: string[]; sinks: "console"[]; lowestLevel: LogLevel }
	| { category: string[]; lowestLevel: LogLevel };

function buildLoggerEntry(key: LolLogCategory): LoggerEntry {
	const category = [...CATEGORIES[key]] as string[];
	const level = readLevel(key);
	if (level === "off") {
		// Empty sinks + override prevents inheriting the parent console sink
		return { category, sinks: [], parentSinks: "override", lowestLevel: "fatal" };
	}
	// The root ["lol"] category owns the console sink for direct ["lol"] calls.
	// Sub-categories own their sink directly with parentSinks: "override" to prevent the
	// root's lowestLevel from silently dropping messages at levels lower than root's level.
	if (CATEGORIES[key].length === 1) {
		return { category, sinks: ["console"], lowestLevel: level };
	}
	return { category, sinks: ["console"], parentSinks: "override", lowestLevel: level };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Runs at module evaluation time (side-effect import from the host component).
// The typeof window guard ensures this is skipped during Stencil SSR.
if (globalThis.window !== undefined) {
	configureSync({
		sinks: { console: getConsoleSink() },
		loggers: [
			// Suppress LogTape internal startup messages
			{ category: ["logtape", "meta"], sinks: ["console"], lowestLevel: "warning" },
			// Root lol logger owns the console sink; all ["lol", *] sub-categories inherit it.
			buildLoggerEntry("root"),
			buildLoggerEntry("draft"),
			buildLoggerEntry("draft-sse"),
			buildLoggerEntry("drafts-sse"),
			buildLoggerEntry("lobby"),
			buildLoggerEntry("champion"),
		],
	});

	// ── Runtime devtools helper ────────────────────────────────────────────────
	// Usage in browser devtools:
	//   lolLog.help()                           → show all categories
	//   lolLog.setLevel("draft", "trace")       → then refresh
	//   lolLog.setLevel("champion", "off")      → silence champion logs
	// oxlint-disable eslint/no-console -- intentional devtools helper
	(globalThis as Record<string, unknown>).lolLog = {
		setLevel(category: LolLogCategory, level: LolLogLevel): void {
			localStorage.setItem(STORAGE_PREFIX + category, level);
			console.info(`[lol-log] ${category} → ${level}  (refresh to apply)`);
		},
		levels(): Record<LolLogCategory, LolLogLevel> {
			return Object.fromEntries((Object.keys(DEFAULTS) as LolLogCategory[]).map(k => [k, readLevel(k)])) as Record<
				LolLogCategory,
				LolLogLevel
			>;
		},
		help(): void {
			const cats = Object.keys(DEFAULTS) as LolLogCategory[];
			console.group("[lol-log] Categories & current levels");
			for (const cat of cats) {
				console.info(`  lolLog.setLevel("${cat}", ...)  →  current: ${readLevel(cat)}`);
			}
			console.info("  Levels: trace | debug | info | warning | error | fatal | off");
			console.info("  lolLog.levels()  →  show all current levels as an object");
			console.groupEnd();
		},
	};
	// oxlint-enable eslint/no-console
}
