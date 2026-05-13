import type { ReactiveControllerHost } from "@ssv/stencil.core";
import type { Atom } from "@tanstack/store";

import type { UseSelectorOptions } from "./store-selector";
import { useSelector } from "./store-selector";

type AtomResult<TValue> = {
	get value(): TValue | undefined;
	set: Atom<TValue>["set"];
};

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
