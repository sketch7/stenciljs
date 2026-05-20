import { mergeProxy } from "../internal";
import type { UseHostContext } from "./reactive-controller";
import { use } from "./use";
import type { EffectCleanup } from "./use-effect";

/** Maps `{ key: Ref<V> | WritableRef<V> }` → `{ key: NonNullable<V> }` for the deps argument of {@link useLoadEffect}. */
type RefObjectValues<T extends Record<string, { current: unknown }>> = {
	[K in keyof T]: T[K] extends { current: infer V } ? NonNullable<V> : never;
};

/**
 * Context passed to the {@link useLoadEffect} setup callback.
 * When deps are provided, the unwrapped dep values are merged into this context alongside the host methods.
 */
export type UseLoadEffectContext<TDeps extends object = object> = UseHostContext & TDeps;

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
 * **With `deps`** — pass a named `{ key: Ref<V> | WritableRef<V> }` object. Each ref's `.current` is verified
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
 * // Named deps — deps merged into ctx alongside host methods
 * useLoadEffect(({ qc }) => {
 *   const observer = new QueryObserver(qc, opts);
 *   return () => { observer.destroy(); };
 * }, { qc: clientRef });
 * ```
 */
export function useLoadEffect(setup: (ctx: UseLoadEffectContext) => EffectCleanup | void): void;
export function useLoadEffect<T extends Record<string, { current: unknown }>>(
	setup: (ctx: UseLoadEffectContext<RefObjectValues<T>>) => EffectCleanup | void,
	deps: T,
): void;
export function useLoadEffect(
	setup: (ctx: UseLoadEffectContext) => EffectCleanup | void,
	deps?: Record<string, { current: unknown }>,
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
					cleanup = setup(mergeProxy(host, values));
				}
			},
			hostDisconnected() {
				cleanup?.();
				cleanup = undefined;
			},
		};
	});
}
