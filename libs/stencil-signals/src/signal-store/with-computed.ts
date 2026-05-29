import type { ComputedDict, MutableStoreInternals, SignalStoreFeature, StoreApi, StoreShape } from "./types";

/**
 * Add read-only derived signals. The factory receives the store built so far
 * (prior state + computed + methods) so derivations can read earlier slices.
 */
export function withComputed<Input extends StoreShape, Computed extends ComputedDict>(
	factory: (store: StoreApi<Input>) => Computed,
): SignalStoreFeature<Input, { computed: Computed }> {
	const feature = (internals: MutableStoreInternals, store: StoreApi<Input>): void => {
		Object.assign(internals.computedSignals, factory(store));
	};
	return feature as unknown as SignalStoreFeature<Input, { computed: Computed }>;
}
