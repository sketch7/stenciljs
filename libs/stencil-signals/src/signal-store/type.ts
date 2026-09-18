import type { EmptyShape, MergeShape, SignalStoreFeature, StoreShape } from "./types";

const _noop: SignalStoreFeature = () => {
	/* intentional no-op */
};

/**
 * Declare the input a custom feature requires (state/computed/methods it reads
 * but does not itself provide). A no-op at runtime — it only pins the `Input`
 * shape so later sub-features in a `signalStoreFeature(...)` get strong types:
 *
 * ```ts
 * function withDoubleCount() {
 *   return signalStoreFeature(
 *     type<{ state: { count: number } }>(),
 *     withComputed(s => ({ double: computed(() => s.count() * 2) })),
 *   );
 * }
 * ```
 */
export function type<Input extends Partial<StoreShape>>(): SignalStoreFeature<
	MergeShape<EmptyShape, Input>,
	Record<never, never>
> {
	return _noop as unknown as SignalStoreFeature<MergeShape<EmptyShape, Input>, Record<never, never>>;
}
