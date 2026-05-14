/** Options shared by selector hooks. `compare` returns `true` when two values are considered equal (skip update / re-render). */
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

export function defaultCompare<T>(a: T | undefined, b: T | undefined): boolean {
	return a === b;
}

export function defaultSelector<TSource, TSelected>(snapshot: TSource): TSelected {
	return snapshot as unknown as TSelected;
}

/** Resolves optional selector + `compare` into a projection pair used by all store/atom hooks. */
export function resolveSelectionSelectors<TSource, TSelected = TSource>(
	selector: ((snapshot: TSource) => TSelected) | undefined,
	options: UseSelectorOptions<TSelected> | undefined,
): {
	select: (snapshot: TSource) => TSelected;
	compare: (a: TSelected | undefined, b: TSelected | undefined) => boolean;
} {
	const compare = options?.compare ?? defaultCompare;
	const select = selector ?? defaultSelector<TSource, TSelected>;
	return { select, compare };
}
