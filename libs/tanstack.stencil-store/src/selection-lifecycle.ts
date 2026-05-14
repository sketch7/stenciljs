import type { ReactiveControllerHost } from "@ssv/stencil.core";
import { use } from "@ssv/stencil.core";

import type { SelectionSource } from "./selection-types";

/**
 * Subscribes to a {@link SelectionSource} for the current Stencil host: rebinds when
 * `getSource()` returns a different instance, tears down on disconnect. Shared by
 * {@link useSelector}, {@link useSelectorSignal}, and {@link useAtomSignal}.
 */
export function useSelectionSourceLifecycle<TSource>(
	getSource: () => SelectionSource<TSource> | undefined,
	args: {
		/**
		 * Called when a source is available. Must return TanStack's `unsubscribe` function.
		 */
		connect: (host: ReactiveControllerHost, store: SelectionSource<TSource>) => () => void;
		/** Called when the source becomes undefined or the host disconnects (after unsubscribe). */
		onClear: () => void;
	},
): void {
	let unsubscribe: (() => void) | undefined;
	let subscribedStore: SelectionSource<TSource> | undefined;

	use((host: ReactiveControllerHost) => ({
		hostWillRender(): void {
			const store = getSource();
			if (store === subscribedStore) {
				return;
			}

			unsubscribe?.();
			subscribedStore = store;

			if (!store) {
				unsubscribe = undefined;
				args.onClear();
				return;
			}

			unsubscribe = args.connect(host, store);
		},
		hostDisconnected(): void {
			unsubscribe?.();
			unsubscribe = undefined;
			subscribedStore = undefined;
			args.onClear();
		},
	}));
}
