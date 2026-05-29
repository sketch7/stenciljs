import type { Signal, WritableSignal } from "../adapters/types";
import { INITIAL_STATE, STATE_SOURCE } from "./state-source";
import type {
	EmptyShape,
	FoldOuts,
	FoldShape,
	MutableStoreInternals,
	SignalStoreFeature,
	Store,
	StoreShape,
} from "./types";

/** Shorthand: a feature's inferred output partial. */
type O = Partial<StoreShape>;

/**
 * Build a Proxy view over the mutable internals. State keys resolve to their
 * writable signal (open) or a cached read-only view (protected); computed and
 * method keys resolve to their values. The two hidden symbols expose the state
 * source and initial state for the free functions.
 */
function createStoreProxy(internals: MutableStoreInternals, readonlyState: boolean): unknown {
	const readonlyCache: Record<string, Signal<unknown>> = {};

	return new Proxy(
		{},
		{
			get(_target, prop): unknown {
				if (prop === STATE_SOURCE) {
					return internals.stateSignals;
				}
				if (prop === INITIAL_STATE) {
					return internals.initial;
				}
				if (typeof prop === "string") {
					const stateSignal = internals.stateSignals[prop];
					if (stateSignal !== undefined) {
						if (!readonlyState) {
							return stateSignal;
						}
						return (readonlyCache[prop] ??= stateSignal.asReadonly());
					}
					if (prop in internals.computedSignals) {
						return internals.computedSignals[prop];
					}
					if (prop in internals.methods) {
						return internals.methods[prop];
					}
				}
				return undefined;
			},

			set(_target, prop): boolean {
				throw new TypeError(
					`signalStore: cannot assign to "${String(prop)}". Use signal.set()/update(), patchState(), or a method.`,
				);
			},

			has(_target, prop): boolean {
				return (
					prop === STATE_SOURCE ||
					prop === INITIAL_STATE ||
					(typeof prop === "string" &&
						(prop in internals.stateSignals || prop in internals.computedSignals || prop in internals.methods))
				);
			},
		},
	);
}

function build(features: readonly SignalStoreFeature[]): unknown {
	const internals: MutableStoreInternals = {
		stateSignals: {} as Record<string, WritableSignal<unknown>>,
		computedSignals: {} as Record<string, Signal<unknown>>,
		methods: {},
		initial: {},
		config: {},
	};

	// Features run against a writable proxy so factories (and the methods they
	// close over) can always mutate state, independent of the public mode.
	const writableStore = createStoreProxy(internals, false);
	for (const feature of features) {
		feature(internals, writableStore as never);
	}

	const isWritable = internals.config.isStateWritable !== false;
	return isWritable ? writableStore : createStoreProxy(internals, true);
}

// ─── Public overloads (arity 1–8 for full inference, then a variadic fallback) ──
//
// Each parameter pins a *concrete* `Input` shape (folded from prior outputs) so
// factory callbacks (`withComputed`/`withMethods`) receive contextual types;
// only the per-feature `Output` (O1…On) is inferred from the argument.

export function signalStore<O1 extends O>(f1: SignalStoreFeature<EmptyShape, O1>): Store<FoldOuts<[O1]>>;
export function signalStore<O1 extends O, O2 extends O>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
): Store<FoldOuts<[O1, O2]>>;
export function signalStore<O1 extends O, O2 extends O, O3 extends O>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
): Store<FoldOuts<[O1, O2, O3]>>;
export function signalStore<O1 extends O, O2 extends O, O3 extends O, O4 extends O>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3]>, O4>,
): Store<FoldOuts<[O1, O2, O3, O4]>>;
export function signalStore<O1 extends O, O2 extends O, O3 extends O, O4 extends O, O5 extends O>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3]>, O4>,
	f5: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4]>, O5>,
): Store<FoldOuts<[O1, O2, O3, O4, O5]>>;
export function signalStore<O1 extends O, O2 extends O, O3 extends O, O4 extends O, O5 extends O, O6 extends O>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3]>, O4>,
	f5: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4]>, O5>,
	f6: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5]>, O6>,
): Store<FoldOuts<[O1, O2, O3, O4, O5, O6]>>;
export function signalStore<
	O1 extends O,
	O2 extends O,
	O3 extends O,
	O4 extends O,
	O5 extends O,
	O6 extends O,
	O7 extends O,
>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3]>, O4>,
	f5: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4]>, O5>,
	f6: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5]>, O6>,
	f7: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5, O6]>, O7>,
): Store<FoldOuts<[O1, O2, O3, O4, O5, O6, O7]>>;
export function signalStore<
	O1 extends O,
	O2 extends O,
	O3 extends O,
	O4 extends O,
	O5 extends O,
	O6 extends O,
	O7 extends O,
	O8 extends O,
>(
	f1: SignalStoreFeature<EmptyShape, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1]>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2]>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3]>, O4>,
	f5: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4]>, O5>,
	f6: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5]>, O6>,
	f7: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5, O6]>, O7>,
	f8: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4, O5, O6, O7]>, O8>,
): Store<FoldOuts<[O1, O2, O3, O4, O5, O6, O7, O8]>>;
export function signalStore<Features extends readonly SignalStoreFeature[]>(
	...features: Features
): Store<FoldShape<Features>>;
export function signalStore(...features: SignalStoreFeature[]): unknown {
	return build(features);
}
