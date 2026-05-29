import type { MethodsDict, MutableStoreInternals, SignalStoreFeature, StoreApi, StoreShape } from "./types";

/**
 * Add methods. The factory receives the store built so far (state is always
 * writable here), so methods can mutate via `.set`/`.update`, `patchState`, or
 * call other store members.
 */
export function withMethods<Input extends StoreShape, Methods extends MethodsDict>(
	factory: (store: StoreApi<Input>) => Methods,
): SignalStoreFeature<Input, { methods: Methods }> {
	const feature = (internals: MutableStoreInternals, store: StoreApi<Input>): void => {
		Object.assign(internals.methods, factory(store));
	};
	return feature as unknown as SignalStoreFeature<Input, { methods: Methods }>;
}
