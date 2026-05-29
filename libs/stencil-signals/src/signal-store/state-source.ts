import type { WritableSignal } from "../adapters/types";

/**
 * Hidden symbol pointing at a store's internal writable state signals.
 * `patchState` / `getState` read through this, so state keys can be named
 * anything (`patch`, `get`, …) with zero reserved-key collisions.
 */
export const STATE_SOURCE = Symbol("@ssv/stencil-signals/state-source");

/** Hidden symbol pointing at a store's merged initial state (for `getInitialState`). */
export const INITIAL_STATE = Symbol("@ssv/stencil-signals/initial-state");

/** Map of state key → writable signal. */
export type StateSignals<State extends object> = {
	[K in keyof State]: WritableSignal<State[K]>;
};

/**
 * The hidden members every store carries. `patchState`, `getState`, and
 * `getInitialState` operate purely through these — never through the public
 * proxy surface — so they work identically in open and protected modes.
 */
export type StateSource<State extends object> = {
	readonly [STATE_SOURCE]: StateSignals<State>;
	readonly [INITIAL_STATE]: State;
};

/** Read every state signal untracked into a plain snapshot object. */
export function snapshotState<State extends object>(signals: StateSignals<State>): State {
	const out = {} as State;
	for (const key of Object.keys(signals) as (keyof State)[]) {
		out[key] = signals[key].peek();
	}
	return out;
}
