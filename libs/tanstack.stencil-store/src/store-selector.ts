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

export class StoreSelector<TSource, TSelected = TSource> implements ReactiveController {
	readonly #host: ReactiveControllerHost;
	readonly #getStore: () => SelectionSource<TSource> | undefined;
	readonly #selector: (snapshot: TSource) => TSelected;
	readonly #compare: (a: TSelected | undefined, b: TSelected) => boolean;
	#unsubscribe?: () => void;
	#subscribedStore?: SelectionSource<TSource>;
	#hasSelected = false;
	#lastSelected?: TSelected;

	// eslint-disable-next-line max-params
	constructor(
		host: ReactiveControllerHost,
		getStore: () => SelectionSource<TSource> | undefined,
		selector?: (snapshot: TSource) => TSelected,
		options?: UseSelectorOptions<TSelected>,
	) {
		this.#host = host;
		this.#getStore = getStore;
		this.#selector = selector ?? (defaultSelector as unknown as (snapshot: TSource) => TSelected);
		this.#compare = options?.compare ?? defaultCompare;
		host.addController(this);
	}

	hostWillRender(): void {
		const store = this.#getStore();
		if (store === this.#subscribedStore) {
			return;
		}

		this.#unsubscribe?.();
		this.#subscribedStore = store;

		if (!store) {
			this.#unsubscribe = undefined;
			this.#hasSelected = false;
			this.#lastSelected = undefined;
			return;
		}

		this.#lastSelected = this.#selector(store.get());
		this.#hasSelected = true;
		this.#unsubscribe = store.subscribe(value => {
			const next = this.#selector(value);
			if (this.#hasSelected && this.#compare(this.#lastSelected, next)) {
				return;
			}
			this.#lastSelected = next;
			this.#hasSelected = true;
			this.#host.requestUpdate();
		}).unsubscribe;
	}

	hostDisconnected(): void {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.#subscribedStore = undefined;
		this.#hasSelected = false;
		this.#lastSelected = undefined;
	}

	get value(): TSelected | undefined {
		return this.#lastSelected;
	}
}

// eslint-disable-next-line max-params
export function useSelector<TSource, TSelected = TSource>(
	host: ReactiveControllerHost,
	getStore: () => SelectionSource<TSource> | undefined,
	selector?: (snapshot: TSource) => TSelected,
	options?: UseSelectorOptions<TSelected>,
): () => TSelected | undefined {
	const ctrl = new StoreSelector(host, getStore, selector, options);
	return () => ctrl.value;
}
