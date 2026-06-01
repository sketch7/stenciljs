import type { DepEntry } from "./dep-tracker";
import { createArrayTracker } from "./dep-tracker";
import { use } from "./use";

/** Cleanup function returned from a {@link useEffect} or {@link useLoadEffect} setup. */
export type EffectCleanup = () => void;

/**
 * Registers an effect on the component.
 *
 * **No deps** — runs after every render (`hostDidRender`). Cleanup runs before the next execution and on disconnect.
 * Equivalent to React's `useEffect(fn)`.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const prev = document.title;
 *   document.title = `count: ${this._count}`;
 *   return () => { document.title = prev; };
 * });
 * ```
 *
 * **Empty deps `[]`** — runs once on connect (`hostConnected`). Cleanup on disconnect.
 * Equivalent to React's `useEffect(fn, [])`.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const onResize = () => { this._width = window.innerWidth; };
 *   window.addEventListener("resize", onResize);
 *   return () => window.removeEventListener("resize", onResize);
 * }, []);
 * ```
 *
 * **Reactive deps** — re-runs at `hostDidRender` whenever any dep value changes.
 * Accepts refs (`{ current: T }`) or getter functions (`() => T`) — the latter enables signal integration.
 * Setup is deferred when a dep is null/undefined and paused if a dep becomes null after running.
 * Equivalent to React's `useEffect(fn, deps)`.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   document.title = `${titleRef.current} — ${countRef.current}`;
 * }, [titleRef, countRef]);
 * ```
 *
 * @example
 * ```ts
 * // Getter functions — signal-friendly
 * useEffect(() => {
 *   render(signal.value);
 * }, [() => signal.value]);
 * ```
 */
export function useEffect(setup: () => EffectCleanup | void, deps?: readonly DepEntry[]): void;
export function useEffect(setup: () => EffectCleanup | void, deps?: readonly DepEntry[]): void {
	if (deps === undefined) {
		use(() => {
			let cleanup: EffectCleanup | void;
			return {
				hostDidRender() {
					cleanup?.();
					cleanup = setup();
				},
				hostDisconnected() {
					cleanup?.();
					cleanup = undefined;
				},
			};
		});
	} else if (deps.length === 0) {
		use(() => {
			let cleanup: EffectCleanup | void;
			return {
				hostConnected() {
					cleanup = setup();
				},
				hostDisconnected() {
					cleanup?.();
					cleanup = undefined;
				},
			};
		});
	} else {
		use(() => {
			const tracker = createArrayTracker(deps);
			let cleanup: EffectCleanup | void;
			return {
				hostConnected() {
					const values = tracker.read();
					if (values === null) {
						return;
					}
					tracker.commit(values);
					cleanup = setup();
				},
				hostDidRender() {
					const values = tracker.read();
					if (values === null) {
						if (tracker.isActive) {
							cleanup?.();
							cleanup = undefined;
							tracker.reset();
						}
						return;
					}
					if (!tracker.hasChanged(values)) {
						return;
					}
					cleanup?.();
					tracker.commit(values);
					cleanup = setup();
				},
				hostDisconnected() {
					cleanup?.();
					cleanup = undefined;
					tracker.reset();
				},
			};
		});
	}
}
