import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

export type UseSelectorOptions<TSelected> = {
	compare?: (a: TSelected | undefined, b: TSelected | undefined) => boolean;
};

export type SelectionSource<T> = {
	get: () => T;
	subscribe: (listener: (value: T) => void) => { unsubscribe: () => void };
};

function defaultCompare<T>(a: T | undefined, b: T | undefined): boolean {
	return a === b;
}

function defaultSelector<TSource, TSelected>(snapshot: TSource): TSelected {
	return snapshot as unknown as TSelected;
}

// eslint-disable-next-line max-params
export function useSelector<TSource, TSelected = TSource>(
	host: ReactiveControllerHost,
	getStore: () => SelectionSource<TSource> | undefined,
	selector?: (snapshot: TSource) => TSelected,
	options?: UseSelectorOptions<TSelected>,
): () => TSelected | undefined {
	const compare = options?.compare ?? defaultCompare;
	const select = selector ?? defaultSelector;
	let unsubscribe: (() => void) | undefined;
	let subscribedStore: SelectionSource<TSource> | undefined;
	let lastSelected: TSelected | undefined;

	const ctrl: ReactiveController = {
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
	};

	host.addController(ctrl);
	return () => lastSelected;
}
