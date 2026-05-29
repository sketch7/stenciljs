import type {
	FoldOutput,
	MergeOutputs,
	MutableStoreInternals,
	SignalStoreFeature,
	SignalStoreFeatureOutputs,
	StoreApi,
	StoreShape,
} from "./types";

/** Shorthand: a feature's inferred output partial. */
type O = Partial<StoreShape>;

/**
 * Compose multiple features into one reusable feature, foldable into any
 * `signalStore`. Sub-features run in order against the same accumulator, so
 * later ones see earlier contributions.
 */
export function signalStoreFeature<Base extends StoreShape>(): SignalStoreFeature<Base, Record<never, never>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O>(
	...features: SignalStoreFeatureOutputs<[O1], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O>(
	...features: SignalStoreFeatureOutputs<[O1, O2], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1, O2]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O, O3 extends O>(
	...features: SignalStoreFeatureOutputs<[O1, O2, O3], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3]>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends O, O2 extends O, O3 extends O, O4 extends O>(
	...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3, O4]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends O,
	O2 extends O,
	O3 extends O,
	O4 extends O,
	O5 extends O,
>(
	...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4, O5], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3, O4, O5]>>;
export function signalStoreFeature<Base extends StoreShape, Features extends readonly SignalStoreFeature[]>(
	...features: Features
): SignalStoreFeature<Base, FoldOutput<Features>>;
export function signalStoreFeature(...features: SignalStoreFeature[]): SignalStoreFeature {
	const composed = (internals: MutableStoreInternals, store: StoreApi<StoreShape>): void => {
		for (const feature of features) {
			feature(internals, store);
		}
	};
	return composed as unknown as SignalStoreFeature;
}
