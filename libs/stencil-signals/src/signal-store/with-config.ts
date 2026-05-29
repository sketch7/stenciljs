import type { MutableStoreInternals, SignalStoreFeature, StoreConfig, StoreShape } from "./types";

type ConfigOutput<C extends StoreConfig> = C extends { isStateWritable: infer W extends boolean }
	? { isStateWritable: W }
	: { isStateWritable: true };

/**
 * Configure the store. Currently controls `isStateWritable`:
 * - omitted / `true` (default) → state is exposed as writable signals.
 * - `false` → state is read-only externally; mutate via `patchState` or methods.
 *
 * Conventionally placed first in the feature list.
 */
export function withConfig<C extends StoreConfig>(config: C): SignalStoreFeature<StoreShape, ConfigOutput<C>> {
	const feature = (internals: MutableStoreInternals): void => {
		if (config.isStateWritable !== undefined) {
			internals.config.isStateWritable = config.isStateWritable;
		}
	};
	return feature as unknown as SignalStoreFeature<StoreShape, ConfigOutput<C>>;
}
