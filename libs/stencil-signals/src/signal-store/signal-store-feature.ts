import type {
	FoldOuts,
	FoldOutput,
	MergeOutputs,
	MutableStoreInternals,
	SignalStoreFeature,
	StoreApi,
	StoreShape,
} from "./types";

/** Shorthand: a feature's inferred output partial. */
type O = Partial<StoreShape>;

/**
 * Compose multiple features into one reusable feature, foldable into any
 * `signalStore`. Sub-features run in order against the same accumulator, so
 * later ones see earlier contributions. Each parameter pins a concrete `Input`
 * (folded from prior outputs onto `Base`) for contextual factory typing.
 */
export function signalStoreFeature<Base extends StoreShape, O1 extends O>(
	f1: SignalStoreFeature<Base, O1>,
): SignalStoreFeature<Base, MergeOutputs<[O1]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O>(
	f1: SignalStoreFeature<Base, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1], Base>, O2>,
): SignalStoreFeature<Base, MergeOutputs<[O1, O2]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O, O3 extends O>(
	f1: SignalStoreFeature<Base, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1], Base>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2], Base>, O3>,
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O, O3 extends O, O4 extends O>(
	f1: SignalStoreFeature<Base, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1], Base>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2], Base>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3], Base>, O4>,
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3, O4]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends O,
	O2 extends O,
	O3 extends O,
	O4 extends O,
	O5 extends O,
>(
	f1: SignalStoreFeature<Base, O1>,
	f2: SignalStoreFeature<FoldOuts<[O1], Base>, O2>,
	f3: SignalStoreFeature<FoldOuts<[O1, O2], Base>, O3>,
	f4: SignalStoreFeature<FoldOuts<[O1, O2, O3], Base>, O4>,
	f5: SignalStoreFeature<FoldOuts<[O1, O2, O3, O4], Base>, O5>,
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3, O4, O5]>>;
export function signalStoreFeature<Features extends readonly SignalStoreFeature[]>(
	...features: Features
): SignalStoreFeature<StoreShape, FoldOutput<Features>>;
export function signalStoreFeature(...features: SignalStoreFeature[]): SignalStoreFeature {
	const composed = (internals: MutableStoreInternals, store: StoreApi<StoreShape>): void => {
		for (const feature of features) {
			feature(internals, store);
		}
	};
	return composed as unknown as SignalStoreFeature;
}
