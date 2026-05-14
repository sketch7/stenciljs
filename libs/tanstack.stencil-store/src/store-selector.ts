import { useSelectionSourceLifecycle } from "./selection-lifecycle";
import type { SelectionSource, UseSelectorOptions } from "./selection-types";
import { resolveSelectionSelectors } from "./selection-types";

export type { SelectionSource, UseSelectorOptions } from "./selection-types";

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
	const { select, compare } = resolveSelectionSelectors(selector, options);
	let lastSelected: TSelected | undefined;

	useSelectionSourceLifecycle(getStore, {
		onClear(): void {
			lastSelected = undefined;
		},
		connect(host, store): () => void {
			lastSelected = select(store.get());
			return store.subscribe(value => {
				const next = select(value);
				if (compare(lastSelected, next)) {
					return;
				}
				lastSelected = next;
				host.requestUpdate();
			}).unsubscribe;
		},
	});

	return () => lastSelected;
}
