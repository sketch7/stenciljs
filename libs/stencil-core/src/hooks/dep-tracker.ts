/** A dep entry: a ref object (`{ current: T }`) or a plain getter function (`() => T`). */
export type DepEntry = { current: unknown } | (() => unknown);

function readEntry(dep: DepEntry): unknown {
	return typeof dep === "function" ? dep() : dep.current;
}

/** Snapshot-based tracker for a fixed-length array of {@link DepEntry} values. */
export type ArrayTracker = {
	read(): unknown[] | null;
	hasChanged(current: unknown[]): boolean;
	commit(values: unknown[]): void;
	reset(): void;
	readonly isActive: boolean;
};

/** Snapshot-based tracker for a named record of {@link DepEntry} values. */
export type NamedTracker = {
	read(): Record<string, unknown> | null;
	hasChanged(current: Record<string, unknown>): boolean;
	commit(values: Record<string, unknown>): void;
	reset(): void;
	readonly isActive: boolean;
};

/**
 * Creates a tracker for an array of deps.
 *
 * @example
 * ```ts
 * const tracker = createArrayTracker([myRef, () => signal.value]);
 * const values = tracker.read(); // [currentVal, signalVal] | null
 * ```
 */
export function createArrayTracker(deps: readonly DepEntry[]): ArrayTracker {
	const len = deps.length;
	let prev: unknown[] | undefined;

	return {
		read(): unknown[] | null {
			if (len === 0) {
				return [];
			}
			const values: unknown[] = Array.from({ length: len });
			for (let i = 0; i < len; i++) {
				const v = readEntry(deps[i]);
				if (v === null || v === undefined) {
					return null;
				}
				values[i] = v;
			}
			return values;
		},
		hasChanged(current: unknown[]): boolean {
			if (prev === undefined) {
				return true;
			}
			for (let i = 0; i < len; i++) {
				if (!Object.is(current[i], prev[i])) {
					return true;
				}
			}
			return false;
		},
		commit(values: unknown[]): void {
			prev = values;
		},
		reset(): void {
			prev = undefined;
		},
		get isActive(): boolean {
			return prev !== undefined;
		},
	};
}

/**
 * Creates a tracker for a named record of deps.
 * `Object.entries` is called once at creation — only index-loops run on each read/compare.
 *
 * @example
 * ```ts
 * const tracker = createNamedTracker({ qc: clientRef, val: () => signal.value });
 * const values = tracker.read(); // { qc: QueryClient, val: number } | null
 * ```
 */
export function createNamedTracker(deps: Record<string, DepEntry>): NamedTracker {
	const entries = Object.entries(deps);
	const keys = entries.map(([k]) => k);
	const len = entries.length;
	let prev: Record<string, unknown> | undefined;

	return {
		read(): Record<string, unknown> | null {
			const values: Record<string, unknown> = {};
			for (let i = 0; i < len; i++) {
				const v = readEntry(entries[i][1]);
				if (v === null || v === undefined) {
					return null;
				}
				values[keys[i]] = v;
			}
			return values;
		},
		hasChanged(current: Record<string, unknown>): boolean {
			if (prev === undefined) {
				return true;
			}
			for (let i = 0; i < len; i++) {
				const k = keys[i];
				if (!Object.is(current[k], prev[k])) {
					return true;
				}
			}
			return false;
		},
		commit(values: Record<string, unknown>): void {
			prev = values;
		},
		reset(): void {
			prev = undefined;
		},
		get isActive(): boolean {
			return prev !== undefined;
		},
	};
}
