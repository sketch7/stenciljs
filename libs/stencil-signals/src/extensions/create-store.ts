import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
import { batch } from "../signals/core";

// ─── Types ────────────────────────────────────────────────────────────────────

type StateMap<T extends object> = { [K in keyof T]: WritableSignal<T[K]> };
type ComputedMap<C extends Record<string, Signal<unknown>>> = {
	[K in keyof C]: C[K];
};

export type Store<T extends object, C extends Record<string, Signal<unknown>> = Record<never, never>> = StateMap<T> &
	ComputedMap<C> & {
		$signal<K extends keyof T>(key: K): WritableSignal<T[K]>;
		$reset(): void;
		/**
		 * Applies a partial update to the store, setting only the provided state keys in a single batched write.
		 *
		 * - **State keys** present in `partial` are updated via `.set()`.
		 * - **Unknown keys** (not in initial state shape) emit a `console.warn` and are skipped.
		 * - **Computed keys** throw a `TypeError` — computed signals are read-only.
		 *
		 * All writes are coalesced into one re-render pass via `batch()`.
		 *
		 * @example
		 * store.$patch({ count: 5, name: "foo" }); // full or partial update
		 */
		$patch(partial: Partial<T>): void;
	};

// ─── Implementation ───────────────────────────────────────────────────────────

/** Wrap a plain object in per-key signals and expose it as a reactive Proxy. */
export function createStore<T extends object>(initialState: T): Store<T>;
export function createStore<T extends object, C extends Record<string, Signal<unknown>>>(
	initialState: T,
	computedFactory: (state: Store<T>) => C,
): Store<T, C>;
export function createStore<T extends object, C extends Record<string, Signal<unknown>> = Record<never, never>>(
	initialState: T,
	computedFactory?: (state: Store<T>) => C,
): Store<T, C> {
	const adapter = getAdapter();

	// Snapshot initial values for $reset().
	const initial = { ...initialState } as T;

	// One signal state per key.
	const signals = {} as StateMap<T>;
	for (const key of Object.keys(initial) as (keyof T)[]) {
		(signals as Record<keyof T, WritableSignal<unknown>>)[key] = adapter.createState(initial[key]);
	}

	// computedSignals is populated after proxy construction (factory receives proxy).
	let computedSignals: C | undefined;

	const proxy = new Proxy({} as Store<T, C>, {
		get(_target, prop: string | symbol) {
			const propStr = String(prop);

			if (propStr === "$signal") {
				return <K extends keyof T>(key: K): WritableSignal<T[K]> =>
					(signals as Record<keyof T, WritableSignal<T[keyof T]>>)[key] as WritableSignal<T[K]>;
			}

			if (propStr === "$reset") {
				return (): void => {
					for (const key of Object.keys(initial) as (keyof T)[]) {
						(signals as Record<keyof T, WritableSignal<unknown>>)[key].set(initial[key]);
					}
				};
			}

			if (propStr === "$patch") {
				return (partial: Partial<T>): void => {
					batch(() => {
						for (const key of Object.keys(partial) as (keyof T)[]) {
							if (key in signals) {
								(signals as Record<keyof T, WritableSignal<unknown>>)[key].set(partial[key]);
							} else if (computedSignals && key in computedSignals) {
								throw new TypeError(`createStore: cannot patch computed property "${String(key)}".`);
							} else {
								console.warn(`createStore: $patch received unknown key "${String(key)}" — skipping.`);
							}
						}
					});
				};
			}

			if (prop in signals) {
				return (signals as Record<string | symbol, WritableSignal<unknown>>)[prop];
			}

			if (computedSignals && prop in computedSignals) {
				return (computedSignals as Record<string | symbol, Signal<unknown>>)[prop];
			}

			return Reflect.get({}, prop);
		},

		set(_target, prop: string | symbol, value: unknown): boolean {
			const propStr = String(prop);

			if (prop in signals) {
				(signals as Record<string | symbol, WritableSignal<unknown>>)[prop].set(value);
				return true;
			}

			if (computedSignals && prop in computedSignals) {
				throw new TypeError(`createStore: cannot write to computed property "${propStr}".`);
			}

			throw new TypeError(
				`createStore: cannot set unknown property "${propStr}". Only keys present in initialState are writable.`,
			);
		},

		has(_target, prop: string | symbol): boolean {
			const propStr = String(prop);
			return (
				prop in signals ||
				(computedSignals ? prop in computedSignals : false) ||
				propStr === "$signal" ||
				propStr === "$reset" ||
				propStr === "$patch"
			);
		},
	});

	// Populate computed signals after proxy is built so factory can read proxy.price() etc.
	if (computedFactory) {
		computedSignals = computedFactory(proxy as Store<T>);
	}

	return proxy;
}
