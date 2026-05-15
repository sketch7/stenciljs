import type { Atom } from "@tanstack/store";

import type { UseSelectorOptions } from "./use-selector";
import { useSelector } from "./use-selector";

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
 * readonly #count = useAtom(() => countAtom);
 *
 * render() {
 *   return <button onClick={() => this.#count.set((p) => p + 1)}>{this.#count.value}</button>;
 * }
 * ```
 */
export function useAtom<TValue>(
	getAtom: () => Atom<TValue> | undefined,
	options?: UseSelectorOptions<TValue>,
): AtomResult<TValue> {
	const value = useSelector(getAtom, undefined, options);
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
