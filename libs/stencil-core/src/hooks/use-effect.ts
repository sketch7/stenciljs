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
 * // Sync document.title after every render
 * _title = useEffect(() => {
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
 * _ = useEffect(() => {
 *   const onResize = () => { this._width = window.innerWidth; };
 *   window.addEventListener("resize", onResize);
 *   return () => window.removeEventListener("resize", onResize);
 * }, []);
 * ```
 */
export function useEffect(setup: () => EffectCleanup | void, deps?: readonly []): void;
export function useEffect(setup: () => EffectCleanup | void, deps?: readonly []): void {
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
	} else {
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
	}
}
