import type { Ref } from "../ref";
import type { UseHostContext } from "./reactive-controller";
import { use } from "./use";

/** Maps `{ key: Ref<V> }` → `{ key: NonNullable<V> }` for the deps argument of {@link useLoadEffect}. */
type RefObjectValues<T extends Record<string, Ref<unknown>>> = {
	[K in keyof T]: T[K] extends Ref<infer V> ? NonNullable<V> : never;
};

/** Cleanup function returned from a {@link useEffect} or {@link useLoadEffect} setup. */
export type EffectCleanup = () => void;

/**
 * Context passed to the {@link useLoadEffect} setup callback.
 * Exposes `requestUpdate()` and element accessors from the host.
 */
export type UseLoadEffectContext = UseHostContext;

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

/**
 * Registers an effect that runs in `hostWillLoad` — after all context providers have connected.
 *
 * Use when setup depends on context (e.g. a `QueryClient` resolved via `useContext`).
 * Exposes `host` for calling `host.requestUpdate()` inside subscriptions.
 * Cleanup runs on `hostDisconnected`.
 *
 * There is no React equivalent — this hook addresses the Stencil-specific hydration ordering
 * where context may not be resolved at `hostConnected` (bottom-up init).
 *
 * **With `deps`** — pass a named `{ key: Ref<V> }` object. Each ref's `.current` is verified
 * non-null before setup fires; the unwrapped values are passed as `{ key: V }` to the callback.
 * Setup is silently skipped if any dep is still null/undefined at `hostWillLoad`.
 *
 * @example
 * ```ts
 * // No deps — runs once, manual ref unwrap
 * useLoadEffect(host => {
 *   const qc = clientRef.current;
 *   const observer = new QueryObserver(qc, opts);
 *   return () => { observer.destroy(); };
 * });
 * ```
 *
 * @example
 * ```ts
 * // Named deps — auto-unwrapped, non-null guaranteed
 * useLoadEffect((_, { qc }) => {
 *   const observer = new QueryObserver(qc, opts);
 *   return () => { observer.destroy(); };
 * }, { qc: clientRef });
 * ```
 */
export function useLoadEffect(setup: (ctx: UseLoadEffectContext) => EffectCleanup | void): void;
export function useLoadEffect<T extends Record<string, Ref<unknown>>>(
	setup: (ctx: UseLoadEffectContext, deps: RefObjectValues<T>) => EffectCleanup | void,
	deps: T,
): void;
export function useLoadEffect(
	// oxlint-disable-next-line typescript/no-explicit-any
	setup: (ctx: UseLoadEffectContext, deps?: any) => EffectCleanup | void,
	deps?: Record<string, Ref<unknown>>,
): void {
	use(host => {
		let cleanup: EffectCleanup | void;
		return {
			hostWillLoad() {
				if (deps === undefined) {
					cleanup = setup(host);
				} else {
					const values: Record<string, unknown> = {};
					for (const [key, ref] of Object.entries(deps)) {
						const val = ref.current;
						if (val === null || val === undefined) {
							return;
						}
						values[key] = val;
					}
					cleanup = setup(host, values);
				}
			},
			hostDisconnected() {
				cleanup?.();
				cleanup = undefined;
			},
		};
	});
}
