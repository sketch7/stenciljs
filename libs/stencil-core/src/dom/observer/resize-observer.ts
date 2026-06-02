import { isInReactiveContext, useEffect } from "../../hooks";
import { resolveTarget } from "./observer.model";
import type { ObserverRef, ObserverTarget, SingleObserverTarget } from "./observer.model";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link resizeObserver}. */
export type ResizeObserverOptions = {
	/** Box model to measure when reporting size changes. Default: `'content-box'`. */
	readonly box?: ResizeObserverBoxOptions;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function createNativeObserver(
	targets: ObserverTarget[],
	callback: (entries: readonly ResizeObserverEntry[]) => void,
	box: ResizeObserverBoxOptions | undefined,
): ResizeObserver | null {
	if (typeof ResizeObserver === "undefined") {
		return null;
	}
	const els = targets.flatMap(t => resolveTarget(t));
	if (els.length === 0) {
		return null;
	}
	const observer = new ResizeObserver(callback);
	for (const el of els) {
		observer.observe(el, { box });
	}
	return observer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Low-level utility for observing element size changes via `ResizeObserver`.
 * Binds automatically to the Stencil component lifecycle when called in a constructor.
 *
 * @example
 * ```ts
 * @Component({ tag: "app-box", shadow: true })
 * export class AppBox extends SsvElement {
 *   @Element() el!: HTMLElement;
 *   readonly $size = signal({ width: 0, height: 0 });
 *   readonly _ = resizeObserver(
 *     () => this.el,
 *     entries => {
 *       const { width, height } = entries[0]!.contentRect;
 *       this.$size.set({ width, height });
 *     },
 *   );
 * }
 * ```
 *
 * @example Multiple targets via array getter
 * ```ts
 * readonly _ = resizeObserver(
 *   () => [this.header, this.body],
 *   entries => { ... },
 * );
 * ```
 *
 * @example Standalone — element already exists, pass directly
 * ```ts
 * const ref = resizeObserver(document.querySelector("#box")!, entry => { ... });
 * ```
 */
export function resizeObserver(
	target: SingleObserverTarget,
	callback: (entry: ResizeObserverEntry) => void,
	options?: ResizeObserverOptions,
): ObserverRef;
export function resizeObserver(
	target: (() => (Element | null | undefined)[]) | ObserverTarget[],
	callback: (entries: readonly ResizeObserverEntry[]) => void,
	options?: ResizeObserverOptions,
): ObserverRef;
export function resizeObserver(
	target: ObserverTarget | ObserverTarget[],
	callback: ((entry: ResizeObserverEntry) => void) | ((entries: readonly ResizeObserverEntry[]) => void),
	options?: ResizeObserverOptions,
): ObserverRef {
	const isMulti = Array.isArray(target) || (typeof target === "function" && Array.isArray(target()));
	const targets = Array.isArray(target) ? target : [target];
	const box = options?.box;
	const nativeCb: (entries: readonly ResizeObserverEntry[]) => void = isMulti
		? (callback as (entries: readonly ResizeObserverEntry[]) => void)
		: entries => (callback as (entry: ResizeObserverEntry) => void)(entries[0] as ResizeObserverEntry);

	if (isInReactiveContext()) {
		let observer: ResizeObserver | null = null;
		let destroyed = false;

		useEffect(() => {
			if (destroyed) {
				return undefined;
			}
			observer = createNativeObserver(targets, nativeCb, box);
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
	const observer = createNativeObserver(targets, nativeCb, box);
	return {
		destroy(): void {
			observer?.disconnect();
		},
	};
}
