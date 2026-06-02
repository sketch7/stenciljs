import { isInReactiveContext, useEffect } from "../../hooks";
import { resolveTarget } from "./observer.model";
import type { ObserverRef, ObserverTarget } from "./observer.model";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link mutationObserver}. Mirrors `MutationObserverInit` — all fields optional. */
export type MutationObserverOptions = {
	/** Observe direct child additions/removals. */
	readonly childList?: boolean;
	/** Observe attribute changes. */
	readonly attributes?: boolean;
	/** Limit attribute observation to specific names. */
	readonly attributeFilter?: string[];
	/** Record the previous attribute value in `MutationRecord.oldValue`. */
	readonly attributeOldValue?: boolean;
	/** Observe text content changes. */
	readonly characterData?: boolean;
	/** Record the previous text value in `MutationRecord.oldValue`. */
	readonly characterDataOldValue?: boolean;
	/** Extend observation to all descendants. */
	readonly subtree?: boolean;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function createNativeObserver(
	targets: ObserverTarget[],
	callback: (records: readonly MutationRecord[]) => void,
	options: MutationObserverOptions | undefined,
): MutationObserver | null {
	if (typeof MutationObserver === "undefined" || MutationObserver === null) {
		return null;
	}
	const els = targets.flatMap(t => resolveTarget(t));
	if (els.length === 0) {
		return null;
	}
	const observer = new MutationObserver(callback);
	for (const el of els) {
		observer.observe(el, options ?? {});
	}
	return observer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Observe DOM mutations via `MutationObserver`.
 * Binds automatically to the Stencil component lifecycle when called in a constructor.
 *
 * The callback always receives `readonly MutationRecord[]` — even for a single target,
 * multiple records can be batched in one tick (e.g., two attribute changes).
 *
 * @example Single target
 * ```ts
 * @Component({ tag: "app-box", shadow: true })
 * export class AppBox extends SsvElement {
 *   @Element() el!: HTMLElement;
 *   @State() mutationCount = 0;
 *
 *   readonly _ = mutationObserver(
 *     () => this.el,
 *     records => { this.mutationCount += records.length; },
 *     { childList: true, attributes: true },
 *   );
 * }
 * ```
 *
 * @example Multiple targets
 * ```ts
 * readonly _ = mutationObserver(
 *   () => [this.header, this.body],
 *   records => { ... },
 *   { childList: true },
 * );
 * ```
 *
 * @example Standalone — element already exists, pass directly
 * ```ts
 * const ref = mutationObserver(document.querySelector("#list")!, records => { ... }, { childList: true });
 * ref.destroy();
 * ```
 */
export function mutationObserver(
	target: ObserverTarget | ObserverTarget[],
	callback: (records: readonly MutationRecord[]) => void,
	options?: MutationObserverOptions,
): ObserverRef {
	const targets = Array.isArray(target) ? target : [target];
	// Wrap to strip the second `observer` argument the native API passes.
	const nativeCb = (mutations: readonly MutationRecord[]): void => callback(mutations);

	if (isInReactiveContext()) {
		let observer: MutationObserver | null = null;
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
