import type { ReactiveControllerHost } from "@ssv/stencil.core";
import type { Atom } from "@tanstack/store";

import type { UseSelectorOptions } from "./store-selector";
import { useSelector } from "./store-selector";

/** Return type of {@link useAtom}. */
type AtomResult<TValue> = {
	/** The current atom value, or `undefined` before the first render. */
	get value(): TValue | undefined;
	/** Updates the atom. Accepts a new value or an updater function. */
	set: Atom<TValue>["set"];
};

/**
 * Returns the current atom value and a setter, re-rendering when the atom changes.
 *
 * @example
 * ```ts
 * readonly #count = useAtom(this, () => countAtom);
 *
 * render() {
 *   return <button onClick={() => this.#count.set((p) => p + 1)}>{this.#count.value}</button>;
 * }
 * ```
 */
export function useAtom<TValue>(
	host: ReactiveControllerHost,
	getAtom: () => Atom<TValue> | undefined,
	options?: UseSelectorOptions<TValue>,
): AtomResult<TValue> {
	const value = useSelector(host, getAtom, undefined, options);
	return {
		get value() {
			return value();
		},
		set(valueOrUpdater) {
			const atom = getAtom();
			if (!atom) {
				return;
			}
			(atom.set as (v: TValue | ((prev: TValue) => TValue)) => void)(valueOrUpdater);
		},
	};
}
