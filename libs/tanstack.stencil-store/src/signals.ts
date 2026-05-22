import { signal } from "@ssv/stencil-signals";
import type { Signal } from "@ssv/stencil-signals";
import { use } from "@ssv/stencil.core";
import type { Atom } from "@tanstack/store";

import type { SelectionSource, UseSelectorOptions } from "./use-selector";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Return type of {@link $useAtom}. */
export type AtomSignal<TValue> = Signal<TValue | undefined> & {
	/** Updates the atom. Accepts a new value or an updater function. */
	set: Atom<TValue>["set"];
	/** Derives a new value from the current atom value and sets it. */
	update: (fn: (current: TValue | undefined) => TValue | undefined) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultCompare<T>(a: T | undefined, b: T | undefined): boolean {
	return a === b;
}

function defaultSelector<TSource, TSelected>(snapshot: TSource): TSelected {
	return snapshot as unknown as TSelected;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Subscribes to a store or atom as a signal, updating when the selected value changes.
 *
 * Requires `useSignalWatcher()` to be active in the component.
 *
 * @example
 * ```ts
 * readonly #count = $useSelector(() => counterStore, s => s.count);
 * readonly #doubled = computed(() => (this.#count() ?? 0) * 2);
 * ```
 *
 * @example
 * ```ts
 * readonly #todos = $useSelector(() => todoStore);
 * ```
 */
export function $useSelector<TSource, TSelected = TSource>(
	getStore: () => SelectionSource<TSource> | undefined,
	selector?: (snapshot: TSource) => TSelected,
	options?: UseSelectorOptions<TSelected>,
): Signal<TSelected | undefined> {
	const compare = options?.compare ?? defaultCompare<TSelected>;
	const select = selector ?? defaultSelector<TSource, TSelected>;
	const sig = signal<TSelected | undefined>();
	let unsubscribe: (() => void) | undefined;
	let subscribedStore: SelectionSource<TSource> | undefined;

	use(() => ({
		hostWillRender(): void {
			const store = getStore();
			if (store === subscribedStore) {
				return;
			}

			unsubscribe?.();
			subscribedStore = store;

			if (!store) {
				unsubscribe = undefined;
				sig.set(undefined);
				return;
			}

			sig.set(select(store.get()));
			unsubscribe = store.subscribe(value => {
				const next = select(value);
				if (compare(sig.peek(), next)) {
					return;
				}
				sig.set(next);
			}).unsubscribe;
		},
		hostDisconnected(): void {
			unsubscribe?.();
			unsubscribe = undefined;
			subscribedStore = undefined;
			sig.set(undefined);
		},
	}));

	return sig.asReadonly();
}

/**
 * Subscribes to a writable atom as a signal with a paired setter.
 *
 * Requires `useSignalWatcher()` to be active in the component.
 *
 * @example
 * ```ts
 * readonly #count = $useAtom(() => countAtom);
 *
 * render() {
 *   return <button onClick={() => this.#count.set(v => v + 1)}>{this.#count()}</button>;
 * }
 * ```
 */
export function $useAtom<TValue>(
	getAtom: () => Atom<TValue> | undefined,
	options?: UseSelectorOptions<TValue>,
): AtomSignal<TValue> {
	const readSig = $useSelector(getAtom, undefined, options);

	return Object.assign(() => readSig(), {
		get: () => readSig.get(),
		peek: () => readSig.peek(),
		set(valueOrUpdater: TValue | ((prev: TValue) => TValue)): void {
			const atom = getAtom();
			if (!atom) {
				return;
			}
			(atom.set as (v: TValue | ((prev: TValue) => TValue)) => void)(valueOrUpdater);
		},
		update(fn: (current: TValue | undefined) => TValue | undefined): void {
			const atom = getAtom();
			if (!atom) {
				return;
			}
			atom.set(fn(readSig.peek()) as TValue);
		},
	}) as AtomSignal<TValue>;
}
