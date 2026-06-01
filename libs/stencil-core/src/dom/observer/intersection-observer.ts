import { isInReactiveContext, useEffect } from "../../hooks";
import { resolveTarget } from "./observer.model";
import type { ObserverRef, ObserverTarget, SingleObserverTarget } from "./observer.model";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link intersectionObserver}. */
export type IntersectionObserverOptions = {
	/** Element or document used as the viewport. Defaults to the browser viewport. */
	readonly root?: Element | Document | null;
	/** Margin around the root. Accepts CSS-like values (e.g. `'10px 20px'`). */
	readonly rootMargin?: string;
	/** Threshold(s) at which the callback fires. */
	readonly threshold?: number | number[];
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function createNativeObserver(
	targets: ObserverTarget[],
	callback: (entries: readonly IntersectionObserverEntry[]) => void,
	options: IntersectionObserverOptions | undefined,
): IntersectionObserver | null {
	if (typeof IntersectionObserver === "undefined") {
		return null;
	}
	const els = targets.flatMap(t => resolveTarget(t));
	if (els.length === 0) {
		return null;
	}
	const observer = new IntersectionObserver(callback, {
		root: options?.root,
		rootMargin: options?.rootMargin,
		threshold: options?.threshold,
	});
	for (const el of els) {
		observer.observe(el);
	}
	return observer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Observe element intersection with the viewport via `IntersectionObserver`.
 * Binds automatically to the Stencil component lifecycle when called in a constructor.
 *
 * @example
 * ```ts
 * @Component({ tag: "app-box", shadow: true })
 * export class AppBox extends SsvElement {
 *   @Element() el!: HTMLElement;
 *   readonly _ = intersectionObserver(
 *     () => this.el,
 *     entry => { ... },
 *   );
 * }
 * ```
 *
 * @example Multiple targets via array getter
 * ```ts
 * readonly _ = intersectionObserver(
 *   () => [this.header, this.body],
 *   entries => { ... },
 * );
 * ```
 *
 * @example Standalone — element already exists, pass directly
 * ```ts
 * const ref = intersectionObserver(document.querySelector("#box")!, entry => { ... });
 * ```
 */
export function intersectionObserver(
	target: SingleObserverTarget,
	callback: (entry: IntersectionObserverEntry) => void,
	options?: IntersectionObserverOptions,
): ObserverRef;
export function intersectionObserver(
	target: (() => (Element | null | undefined)[]) | ObserverTarget[],
	callback: (entries: readonly IntersectionObserverEntry[]) => void,
	options?: IntersectionObserverOptions,
): ObserverRef;
export function intersectionObserver(
	target: ObserverTarget | ObserverTarget[],
	callback: ((entry: IntersectionObserverEntry) => void) | ((entries: readonly IntersectionObserverEntry[]) => void),
	options?: IntersectionObserverOptions,
): ObserverRef {
	const isMulti = Array.isArray(target) || (typeof target === "function" && Array.isArray(target()));
	const targets = Array.isArray(target) ? target : [target];
	const nativeCb: (entries: readonly IntersectionObserverEntry[]) => void = isMulti
		? (callback as (entries: readonly IntersectionObserverEntry[]) => void)
		: entries => (callback as (entry: IntersectionObserverEntry) => void)(entries[0] as IntersectionObserverEntry);

	if (isInReactiveContext()) {
		let observer: IntersectionObserver | null = null;
		let destroyed = false;

		useEffect(() => {
			if (destroyed) {
				return;
			}
			observer = createNativeObserver(targets, nativeCb, options);
			return () => {
				observer?.disconnect();
				observer = null;
			};
		}, []);

		return {
			destroy(): void {
				destroyed = true;
				observer?.disconnect();
				observer = null;
			},
		};
	}

	// Standalone (non-host-bound): caller owns the lifecycle.
	const observer = createNativeObserver(targets, nativeCb, options);
	return {
		destroy(): void {
			observer?.disconnect();
		},
	};
}
