import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";
import type { Atom } from "@tanstack/store";

import type { SelectionSource, UseSelectorOptions } from "./store-selector";
import { StoreSelector } from "./store-selector";

class StoreAtom<TValue> {
	readonly #getAtom: () => Atom<TValue> | undefined;
	// stored to satisfy no-new lint rule; lifecycle is managed via host controllers
	// eslint-disable-next-line no-unused-private-class-members
	readonly #selector: StoreSelector<TValue, TValue>;

	constructor(
		host: ReactiveControllerHost,
		getAtom: () => Atom<TValue> | undefined,
		options?: UseSelectorOptions<TValue>,
	) {
		this.#getAtom = getAtom;
		this.#selector = new StoreSelector<TValue, TValue>(host, getAtom, undefined, options);
	}

	get value(): TValue | undefined {
		return this.#getAtom()?.get();
	}

	set(value: TValue): void;
	set(updater: (prev: TValue) => TValue): void;
	set(valueOrUpdater: TValue | ((prev: TValue) => TValue)): void {
		const atom = this.#getAtom();
		if (!atom) {
			return;
		}
		(atom.set as (v: TValue | ((prev: TValue) => TValue)) => void)(valueOrUpdater);
	}
}

export type { SelectionSource, UseSelectorOptions };
export type { ReactiveController, ReactiveControllerHost };

export function createAtomCtrl<TValue>(
	host: ReactiveControllerHost,
	getAtom: () => Atom<TValue> | undefined,
	options?: UseSelectorOptions<TValue>,
): StoreAtom<TValue> {
	return new StoreAtom(host, getAtom, options);
}
