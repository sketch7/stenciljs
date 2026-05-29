import type {
	FoldOutput,
	MergeOutputs,
	MutableStoreInternals,
	SignalStoreFeature,
	SignalStoreFeatureOutputs,
	StoreApi,
	StoreShape,
} from "./types";

/**
 * Compose multiple features into one reusable feature, foldable into any
 * `signalStore`. Sub-features run in order against the same accumulator, so
 * later ones see earlier contributions.
 */
export function signalStoreFeature<Base extends StoreShape>(): SignalStoreFeature<Base, Record<never, never>>;
export function signalStoreFeature<Base extends StoreShape, O1 extends Partial<StoreShape>>(
	...features: SignalStoreFeatureOutputs<[O1], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2], Base>): SignalStoreFeature<Base, MergeOutputs<[O1, O2]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
>(...features: SignalStoreFeatureOutputs<[O1, O2, O3], Base>): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
>(
	...features: SignalStoreFeatureOutputs<[O1, O2, O3, O4], Base>
): SignalStoreFeature<Base, MergeOutputs<[O1, O2, O3, O4]>>;
export function signalStoreFeature<
	Base extends StoreShape,
	O1 extends Partial<StoreShape>,
	O2 extends Partial<StoreShape>,
	O3 extends Partial<StoreShape>,
	O4 extends Partial<StoreShape>,
	O5 extends Partial<StoreShape>,
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
