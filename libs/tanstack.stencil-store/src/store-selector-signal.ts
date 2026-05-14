import type { Signal } from "@ssv/stencil-signals";
import { signal } from "@ssv/stencil-signals";

import { useSelectionSourceLifecycle } from "./selection-lifecycle";
import type { SelectionSource, UseSelectorOptions } from "./selection-types";
import { resolveSelectionSelectors } from "./selection-types";

/** Options for {@link useSelectorSignal}. Same semantics as {@link UseSelectorOptions}: `compare` returns `true` to skip updates. */
export type UseSelectorSignalOptions<TSelected> = UseSelectorOptions<TSelected>;

/**
 * Subscribes to a TanStack store or atom and mirrors the selected slice into a
 * readonly stencil-signal. TanStack remains the source of truth; the `compare`
 * option maps to the signal backend's `equals` (both `true` mean “no change / skip”).
 *
 * Use with {@link SignalWatcherMixin} or {@link useSignalController} so reads in
 * `render()` schedule updates.
 *
 * @example
 * ```ts
 * readonly #count = useSelectorSignal(() => counterStore, s => s.count);
 * ```
 */
export function useSelectorSignal<TSource, TSelected = TSource>(
	getStore: () => SelectionSource<TSource> | undefined,
	selector?: (snapshot: TSource) => TSelected,
	options?: UseSelectorSignalOptions<TSelected>,
): Signal<TSelected | undefined> {
	const { select, compare } = resolveSelectionSelectors(selector, options);
	const equals = (a: TSelected | undefined, b: TSelected | undefined): boolean => compare(a, b);
	const selected = signal<TSelected | undefined>(undefined, { equals });

	useSelectionSourceLifecycle(getStore, {
		onClear(): void {
			selected.set(undefined);
		},
		connect(_host, store): () => void {
			selected.set(select(store.get()));
			return store.subscribe(value => {
				selected.set(select(value));
			}).unsubscribe;
		},
	});

	return selected.asReadonly();
}
