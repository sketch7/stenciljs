import type { WritableSignal } from "../adapters/types";
import { effect } from "../extensions/effect";
import { batch } from "../signals/core";
import { INITIAL_STATE, STATE_SOURCE, snapshotState } from "./state-source";
import type { StateSource } from "./types";

/** A partial update or a function deriving one from the current state. */
export type StateUpdater<State extends object> = Partial<State> | ((state: State) => Partial<State>);

/**
 * Apply one or more updates to a store's state in a single batched write.
 * Updaters may be partial objects or functions `(state) => partial`; function
 * updaters receive a fresh snapshot so sequential updaters compose. Throws on
 * an unknown state key.
 */
export function patchState<State extends object>(store: StateSource<State>, ...updaters: StateUpdater<State>[]): void {
	const signals = store[STATE_SOURCE] as Record<string, WritableSignal<unknown>>;
	batch(() => {
		for (const updater of updaters) {
			const partial = typeof updater === "function" ? updater(snapshotState(store[STATE_SOURCE])) : updater;
			for (const key of Object.keys(partial)) {
				const sig = signals[key];
				if (sig === undefined) {
					throw new TypeError(`patchState: unknown state key "${key}".`);
				}
				sig.set((partial as Record<string, unknown>)[key]);
			}
		}
	});
}

/** Read the store's whole state as a plain, untracked snapshot object. */
export function getState<State extends object>(store: StateSource<State>): State {
	return snapshotState(store[STATE_SOURCE]);
}

/** Read the store's merged initial state (as passed to `withState`). */
export function getInitialState<State extends object>(store: StateSource<State>): State {
	return { ...store[INITIAL_STATE] };
}

/**
 * Reactively watches a store's state, calling `watcher` immediately with the
 * current state and again on every subsequent change.
 * The returned `destroy()` allows manual teardown.
 */
export function watchState<State extends object>(
	store: StateSource<State>,
	watcher: (state: State) => void,
): { destroy: () => void } {
	const signals = store[STATE_SOURCE];

	const ref = effect(() => {
		const state = {} as State;
		for (const key of Object.keys(signals) as (keyof State)[]) {
			state[key] = signals[key]();
		}
		watcher(state);
	});

	return { destroy: ref.dispose };
}
