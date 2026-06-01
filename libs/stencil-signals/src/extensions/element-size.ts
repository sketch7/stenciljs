import { ensureReactiveContext, use } from "@ssv/stencil-core";
import { resizeObserver } from "@ssv/stencil-core/dom";
import type { SingleObserverTarget } from "@ssv/stencil-core/dom";

import type { Signal } from "../adapters/types";
import { signal } from "../signals/core";

/** Measured dimensions of an element. */
export type ElementSizeValue = {
	readonly width: number;
	readonly height: number;
};

/** Options for {@link elementSize}. */
export type ElementSizeOptions = {
	/**
	 * Which box model to observe.
	 *
	 * @default 'border-box'
	 */
	readonly box?: ResizeObserverBoxOptions;
	/**
	 * Value returned before the first measurement and after disconnect.
	 *
	 * @default { width: 0, height: 0 }
	 */
	readonly initialValue?: ElementSizeValue;
};

const DEFAULT_SIZE: ElementSizeValue = { width: 0, height: 0 };

/**
 * Signal containing the measured dimensions of an element, updated via `ResizeObserver`.
 *
 * @example
 * ```ts
 * @Component({ tag: "app-box", shadow: true })
 * export class AppBox extends SsvElement {
 *   @Element() el!: HTMLElement;
 *   readonly size = elementSize(() => this.el);
 * }
 * ```
 *
 * @example With `content-box`
 * ```ts
 * readonly size = elementSize(() => this.el, { box: 'content-box' });
 * ```
 */
export function elementSize(target: SingleObserverTarget, options?: ElementSizeOptions): Signal<ElementSizeValue> {
	const initialValue = options?.initialValue ?? DEFAULT_SIZE;
	const size = signal<ElementSizeValue>(initialValue);
	const box = options?.box ?? "border-box";

	const updateSize = (entry: ResizeObserverEntry): void => {
		if (box === "content-box") {
			const cs = entry.contentBoxSize?.[0];
			size.set({
				width: cs?.inlineSize ?? entry.contentRect.width,
				height: cs?.blockSize ?? entry.contentRect.height,
			});
		} else {
			const bs = entry.borderBoxSize?.[0];
			size.set({
				width: bs?.inlineSize ?? entry.contentRect.width,
				height: bs?.blockSize ?? entry.contentRect.height,
			});
		}
	};

	resizeObserver(target, updateSize, { box });

	ensureReactiveContext();

	use({
		hostDisconnected(): void {
			size.set(initialValue);
		},
	});

	return size.asReadonly();
}
