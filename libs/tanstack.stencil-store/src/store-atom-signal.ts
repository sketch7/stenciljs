import type { WritableSignal } from "@ssv/stencil-signals";
import { signal } from "@ssv/stencil-signals";
import type { Atom } from "@tanstack/store";

import { useSelectionSourceLifecycle } from "./selection-lifecycle";
import type { SelectionSource, UseSelectorOptions } from "./selection-types";
import { resolveSelectionSelectors } from "./selection-types";

/** Options for {@link useAtomSignal}. `compare` follows TanStack selector semantics (`true` = skip). */
export type UseAtomSignalOptions<TValue> = UseSelectorOptions<TValue>;

/**
 * Subscribes to a TanStack atom and exposes a {@link WritableSignal} synced with
 * `atom.get()`. Writes call through to `atom.set`; external atom updates update
 * the signal (subject to `compare` / signal `equals`).
 *
 * @example
 * ```ts
 * readonly #count = useAtomSignal(() => countAtom);
 *
 * render() {
 *   return <button onClick={() => this.#count.update(n => (n ?? 0) + 1)}>{this.#count()}</button>;
 * }
 * ```
 */
export function useAtomSignal<TValue>(
	getAtom: () => Atom<TValue> | undefined,
	options?: UseAtomSignalOptions<TValue>,
): WritableSignal<TValue | undefined> {
	const { select, compare } = resolveSelectionSelectors<TValue, TValue>(undefined, options);
	const equals = (a: TValue | undefined, b: TValue | undefined): boolean => compare(a, b);
	const inner = signal<TValue | undefined>(undefined, { equals });

	const getSource = (): SelectionSource<TValue> | undefined => getAtom() as SelectionSource<TValue> | undefined;

	useSelectionSourceLifecycle(getSource, {
		onClear(): void {
			inner.set(undefined);
		},
		connect(_host, store): () => void {
			inner.set(select(store.get()));
			return store.subscribe(value => {
				inner.set(select(value));
			}).unsubscribe;
		},
	});

	return Object.assign(() => inner(), {
		get: () => inner.get(),
		peek: () => inner.peek(),
		set(value: TValue | undefined): void {
			const atom = getAtom();
			if (!atom) {
				return;
			}
			atom.set(value as TValue);
		},
		update(fn: (current: TValue | undefined) => TValue): void {
			const atom = getAtom();
			if (!atom) {
				return;
			}
			atom.set(prev => fn(prev));
		},
		asReadonly: () => inner.asReadonly(),
	}) as WritableSignal<TValue | undefined>;
}
