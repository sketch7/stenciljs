// oxlint-disable no-console
/**
 * @internal
 * Replaced at build time by tsdown/Vite `define`.
 * - `"false"` (default) — all logging off; bundler eliminates all log branches.
 * - `"true"` or `"*"` — all categories enabled.
 * - `"cat1,cat2"` — only those categories enabled.
 */
declare const DEBUG: string;

/**
 * Internal two-level logger returned by {@link createLogger}.
 * All methods accept a lazy factory so interpolations are never evaluated when logging is off.
 * An optional `data` argument is logged as a second value alongside the message.
 * @internal
 */
export type Logger = {
	/** Informational message — maps to `console.log`. */
	log: (msg: () => string, data?: unknown) => void;
	/** Warning message — maps to `console.warn`. */
	warn: (msg: () => string, data?: unknown) => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (_msg: () => string, _data?: unknown): void => undefined;

const noopLogger: Logger = { log: noop, warn: noop };

// These two constants are resolved to compile-time literals when DEBUG is replaced by define.
// DEBUG = "false" → _debugEnabled = false → all branches below are dead code (DCE'd by bundler).
const _debugEnabled = typeof DEBUG !== "undefined" && DEBUG !== "false" && DEBUG !== "";
const _categories: Set<string> | null =
	_debugEnabled && DEBUG !== "true" && DEBUG !== "*" ? new Set(DEBUG.split(",").map(s => s.trim())) : null;

/**
 * Returns a category-prefixed logger, a no-op when the category is disabled, or a no-op
 * for all categories when `DEBUG` is `"false"` (the production default).
 *
 * `DEBUG` is replaced at build time by tsdown/Vite `define`, which lets the bundler
 * eliminate all logging branches from the production output. The `typeof` guard prevents
 * a `ReferenceError` when no bundler define is configured (e.g. direct TS execution in tests).
 *
 * Enable all in dev:      `SSV_DEBUG=true pnpm dev`
 * Enable selective in dev: `SSV_DEBUG=transfer-state,query-hydration pnpm dev`
 *
 * @internal
 */
export const createLogger = (category: string): Logger =>
	!_debugEnabled || (_categories !== null && !_categories.has(category))
		? noopLogger
		: {
				log: (msg, data) =>
					data === undefined
						? console.log(`[ssv:${category}] ${msg()}`)
						: console.log(`[ssv:${category}] ${msg()}`, data),
				warn: (msg, data) =>
					data === undefined
						? console.warn(`[ssv:${category}] ${msg()}`)
						: console.warn(`[ssv:${category}] ${msg()}`, data),
			};
