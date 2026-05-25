import { use } from "@ssv/stencil-core";

/** Options for {@link useSelector}. */
export type UseSelectorOptions<TSelected> = {
	/** Custom equality — return `true` to skip re-render. Defaults to `===`. */
	compare?: (a: TSelected | undefined, b: TSelected | undefined) => boolean;
};

/** Minimal interface satisfied by any TanStack Store atom or store. */
export type SelectionSource<T> = {
	/** Returns the current state snapshot. */
	get: () => T;
	/** Subscribes to state changes. Returns an object with an `unsubscribe` teardown. */
	subscribe: (listener: (value: T) => void) => { unsubscribe: () => void };
};

function defaultCompare<T>(a: T | undefined, b: T | undefined): boolean {
	return a === b;
}

function defaultSelector<TSource, TSelected>(snapshot: TSource): TSelected {
	return snapshot as unknown as TSelected;
}

/**
 * Subscribes to a store or atom and schedules a re-render when the selected value changes.
 *
 * Omit `selector` to subscribe to the whole value.
 *
 * @example
 * ```ts
 * readonly #count = useSelector(() => counterStore, s => s.count);
 * ```
 *
 * @example
 * ```ts
 * readonly #todos = useSelector(() => todoStore);
 * ```
 */
export function useSelector<TSource, TSelected = TSource>(
	getStore: () => SelectionSource<TSource> | undefined,
	selector?: (snapshot: TSource) => TSelected,
	options?: UseSelectorOptions<TSelected>,
): () => TSelected | undefined {
	const compare = options?.compare ?? defaultCompare;
	const select = selector ?? defaultSelector;
	let unsubscribe: (() => void) | undefined;
	let subscribedStore: SelectionSource<TSource> | undefined;
	let lastSelected: TSelected | undefined;

	use(host => ({
		hostWillRender(): void {
			const store = getStore();
			if (store === subscribedStore) {
				return;
			}

			unsubscribe?.();
			subscribedStore = store;

			if (!store) {
				unsubscribe = undefined;
				lastSelected = undefined;
				return;
			}

			lastSelected = select(store.get());
			unsubscribe = store.subscribe(value => {
				const next = select(value);
				if (compare(lastSelected, next)) {
					return;
				}
				lastSelected = next;
				host.requestUpdate();
			}).unsubscribe;
		},
		hostDisconnected(): void {
			unsubscribe?.();
			unsubscribe = undefined;
			subscribedStore = undefined;
			lastSelected = undefined;
		},
	}));

	return () => lastSelected;
}
