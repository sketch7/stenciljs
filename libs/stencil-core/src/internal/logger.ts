// oxlint-disable no-console
/** @internal Replaced by `false` at build time via tsdown/Vite `define`. */
declare const DEBUG: boolean;

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

/**
 * Returns a category-prefixed logger when `DEBUG` is truthy, otherwise a no-op.
 *
 * `DEBUG` is replaced at build time by tsdown/Vite `define`, which lets the bundler
 * eliminate all logging branches from the production output. The `typeof` guard prevents
 * a `ReferenceError` when no bundler define is configured (e.g. direct TS execution in tests).
 *
 * Enable in dev: `SSV_DEBUG=true pnpm dev`
 *
 * @internal
 */
export const createLogger = (category: string): Logger =>
	typeof DEBUG !== "undefined" && DEBUG
		? {
				log: (msg, data) =>
					data === undefined
						? console.log(`[ssv:${category}] ${msg()}`)
						: console.log(`[ssv:${category}] ${msg()}`, data),
				warn: (msg, data) =>
					data === undefined
						? console.warn(`[ssv:${category}] ${msg()}`)
						: console.warn(`[ssv:${category}] ${msg()}`, data),
			}
		: noopLogger;
