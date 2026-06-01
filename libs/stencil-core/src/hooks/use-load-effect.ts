import { mergeProxy } from "../internal";
import type { DepEntry } from "./dep-tracker";
import { createNamedTracker } from "./dep-tracker";
import type { UseHostContext } from "./reactive-controller";
import { use } from "./use";
import type { EffectCleanup } from "./use-effect";

/**
 * Maps a named `DepEntry` record to its unwrapped, non-nullable values.
 * Getter functions (`() => T`) resolve to `NonNullable<T>`; refs (`{ current: T }`) do the same.
 */
type DepObjectValues<T extends Record<string, DepEntry>> = {
	[K in keyof T]: T[K] extends () => infer V
		? NonNullable<V>
		: T[K] extends { current: infer V }
			? NonNullable<V>
			: never;
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
 * **With `deps`** — pass a named `{ key: Ref<V> | WritableRef<V> | (() => V) }` object. Each dep value is
 * verified non-null before setup fires; the unwrapped values are passed as `{ key: V }` to the callback.
 * Setup is silently skipped if any dep is still null/undefined at `hostWillLoad`.
 * **Reactive re-runs** — on every `hostWillRender`, dep values are compared against the snapshot
 * taken at the last setup call. When any dep changes, cleanup runs and setup is called again with
 * the updated values (aligned with React's `useEffect(fn, deps)` semantics). If a dep becomes
 * null/undefined, cleanup runs and the effect is paused until the next dep change.
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
 *
 * @example
 * ```ts
 * // Getter fn as dep — signal-friendly
 * useLoadEffect(({ val }) => {
 *   console.log(val);
 * }, { val: () => signal.value });
 * ```
 */
export function useLoadEffect(setup: (ctx: UseLoadEffectContext) => EffectCleanup | void): void;
export function useLoadEffect<T extends Record<string, DepEntry>>(
	setup: (ctx: UseLoadEffectContext<DepObjectValues<T>>) => EffectCleanup | void,
	deps: T,
): void;
export function useLoadEffect(
	setup: (ctx: UseLoadEffectContext) => EffectCleanup | void,
	deps?: Record<string, DepEntry>,
): void {
	use(host => {
		let cleanup: EffectCleanup | void;

		if (deps === undefined) {
			return {
				hostWillLoad() {
					cleanup = setup(host);
				},
				hostDisconnected() {
					cleanup?.();
					cleanup = undefined;
				},
			};
		}

		const tracker = createNamedTracker(deps);

		return {
			hostWillLoad() {
				const values = tracker.read();
				if (values === null) {
					return;
				}
				tracker.commit(values);
				cleanup = setup(mergeProxy(host, values));
			},
			hostWillRender() {
				const values = tracker.read();
				if (tracker.isActive) {
					if (values === null) {
						cleanup?.();
						cleanup = undefined;
						tracker.reset();
						return;
					}
					if (!tracker.hasChanged(values)) {
						return;
					}
					cleanup?.();
					tracker.commit(values);
					cleanup = setup(mergeProxy(host, values));
				} else {
					if (values === null) {
						return;
					}
					tracker.commit(values);
					cleanup = setup(mergeProxy(host, values));
				}
			},
			hostDisconnected() {
				cleanup?.();
				cleanup = undefined;
				tracker.reset();
			},
		};
	});
}
