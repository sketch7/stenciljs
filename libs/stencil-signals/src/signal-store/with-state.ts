import { getAdapter } from "../adapters/active";
import type { MutableStoreInternals, SignalStoreFeature, StoreShape } from "./types";

/** Add state slices. Each key becomes a writable signal and is recorded for `getInitialState`. */
export function withState<State extends object>(initialState: State): SignalStoreFeature<StoreShape, { state: State }> {
	const feature = (internals: MutableStoreInternals): void => {
		const adapter = getAdapter();
		for (const key of Object.keys(initialState) as (keyof State)[]) {
			const k = key as string;
			internals.stateSignals[k] = adapter.createState(initialState[key]);
			internals.initial[k] = initialState[key];
		}
	};
	return feature as unknown as SignalStoreFeature<StoreShape, { state: State }>;
}
