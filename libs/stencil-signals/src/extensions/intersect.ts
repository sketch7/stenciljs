import { peekCurrentHost, use } from "@ssv/stencil-core";
import { intersectionObserver } from "@ssv/stencil-core/dom";
import type { SingleObserverTarget } from "@ssv/stencil-core/dom";

import type { Signal } from "../adapters/types";
import { signal } from "../signals/core";

/** Options for {@link intersect}. */
export type IntersectOptions = {
	/** Element or document used as the viewport. Defaults to the browser viewport. */
	readonly root?: Element | Document | null;
	/** Margin around the root. Accepts CSS-like values (e.g. `'10px 20px'`). */
	readonly rootMargin?: string;
	/** Threshold(s) at which the signal updates. */
	readonly threshold?: number | number[];
	/**
	 * Value returned before the first observation and after disconnect.
	 *
	 * @default undefined
	 */
	readonly initialValue?: IntersectionObserverEntry;
};

/**
 * Signal containing the latest `IntersectionObserverEntry` for an element, updated via `IntersectionObserver`.
 *
 * @example
 * ```ts
 * @Component({ tag: "app-box", shadow: true })
 * export class AppBox extends SsvElement {
 *   @Element() el!: HTMLElement;
 *   readonly intersect = intersect(() => this.el);
 *   readonly isVisible = computed(() => this.intersect()?.isIntersecting ?? false);
 * }
 * ```
 *
 * @example With threshold
 * ```ts
 * readonly intersect = intersect(() => this.el, { threshold: [0, 0.5, 1] });
 * ```
 */
export function intersect(
	target: SingleObserverTarget,
	options?: IntersectOptions,
): Signal<IntersectionObserverEntry | undefined> {
	const initialValue = options?.initialValue;
	const $entry = signal<IntersectionObserverEntry | undefined>(initialValue);

	intersectionObserver(target, entry => $entry.set(entry), {
		root: options?.root,
		rootMargin: options?.rootMargin,
		threshold: options?.threshold,
	});

	if (peekCurrentHost() === null) {
		throw new Error("intersect() must be used within a component's reactive context");
	}

	use({
		hostDisconnected(): void {
			$entry.set(initialValue);
		},
	});

	return $entry.asReadonly();
}
