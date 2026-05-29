import type { WritableSignal } from "../adapters/types";

/**
 * Hidden symbol pointing at a store's internal writable state signals.
 * `patchState` / `getState` read through this, so state keys can be named
 * anything (`patch`, `get`, …) with zero reserved-key collisions.
 */
export const STATE_SOURCE = Symbol("@ssv/stencil-signals/store/state-source");

/** Hidden symbol pointing at a store's merged initial state (for `getInitialState`). */
export const INITIAL_STATE = Symbol("@ssv/stencil-signals/store/initial-state");

export type StateSignals<State extends object> = {
	[K in keyof State]: WritableSignal<State[K]>;
};

export type StateSource<State extends object> = {
	readonly [STATE_SOURCE]: StateSignals<State>;
	readonly [INITIAL_STATE]: State;
};

export function snapshotState<State extends object>(signals: StateSignals<State>): State {
	const out = {} as State;
	for (const key of Object.keys(signals) as (keyof State)[]) {
		out[key] = signals[key].peek();
	}
	return out;
}
