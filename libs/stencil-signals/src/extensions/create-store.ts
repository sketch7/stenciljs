import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StateMap<T extends object> = { [K in keyof T]: WritableSignal<T[K]> };
type ComputedValueMap<C extends Record<string, Signal<unknown>>> = {
	[K in keyof C]: C[K] extends Signal<infer V> ? V : never;
};

export type Store<T extends object, C extends Record<string, Signal<unknown>> = Record<never, never>> = T &
	ComputedValueMap<C> & {
		$signal<K extends keyof T>(key: K): WritableSignal<T[K]>;
		$reset(): void;
	};

// ─── Implementation ───────────────────────────────────────────────────────────

/** Wrap a plain object in per-key signals and expose it as a reactive Proxy. */
export function createStore<T extends object, C extends Record<string, Signal<unknown>> = Record<never, never>>(
	initialState: T,
	computedFactory?: (state: T) => C,
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

			if (prop in signals) {
				return (signals as Record<string | symbol, WritableSignal<unknown>>)[prop]();
			}

			if (computedSignals && prop in computedSignals) {
				return (computedSignals as Record<string | symbol, Signal<unknown>>)[prop]();
			}
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
				propStr === "$reset"
			);
		},
	});

	// Populate computed signals after proxy is built so factory can read proxy.price etc.
	if (computedFactory) {
		computedSignals = computedFactory(proxy as unknown as T);
	}

	return proxy;
}
