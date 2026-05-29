import type { Signal, WritableSignal } from "../adapters/types";
import { INITIAL_STATE, STATE_SOURCE } from "./state-source";
import type {
	EmptyShape,
	FoldOuts,
	FoldShape,
	MutableStoreInternals,
	SignalStoreFeature,
	SignalStoreFeatureOutputs,
	Store,
	StoreShape,
} from "./types";

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

// Each parameter pins the store shape folded from prior outputs, so factory
// callbacks (`withComputed`/`withMethods`) receive contextual types.
export function signalStore(): Store<EmptyShape>;
export function signalStore<O1 extends Partial<StoreShape>>(
	...features: SignalStoreFeatureOutputs<[O1]>
): Store<FoldOuts<[O1]>>;
export function signalStore<O1 extends Partial<StoreShape>, O2 extends Partial<StoreShape>>(
	...features: SignalStoreFeatureOutputs<[O1, O2]>
): Store<FoldOuts<[O1, O2]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3]>): Store<FoldOuts<[O1, O2, O3]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4]>): Store<FoldOuts<[O1, O2, O3, O4]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
	O5 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4, O5]>): Store<FoldOuts<[O1, O2, O3, O4, O5]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
	O5 extends Partial<StoreShape>,
	O6 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4, O5, O6]>): Store<FoldOuts<[O1, O2, O3, O4, O5, O6]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
	O5 extends Partial<StoreShape>,
	O6 extends Partial<StoreShape>,
	O7 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4, O5, O6, O7]>): Store<FoldOuts<[O1, O2, O3, O4, O5, O6, O7]>>;
export function signalStore<
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
	O5 extends Partial<StoreShape>,
	O6 extends Partial<StoreShape>,
	O7 extends Partial<StoreShape>,
	O8 extends Partial<StoreShape>,
>(
	...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4, O5, O6, O7, O8]>
): Store<FoldOuts<[O1, O2, O3, O4, O5, O6, O7, O8]>>;
export function signalStore<Features extends readonly SignalStoreFeature[]>(
	...features: Features
): Store<FoldShape<Features>>;
export function signalStore(...features: SignalStoreFeature[]): unknown {
	return build(features);
}
