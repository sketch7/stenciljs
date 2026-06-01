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
		let prevValues: Record<string, unknown> | undefined;

		/** Reads all dep values; returns `null` if any is null/undefined (skip). */
		const readValues = (): Record<string, unknown> | null => {
			const values: Record<string, unknown> = {};
			for (const [key, ref] of Object.entries(deps ?? {})) {
				const val = ref.current;
				if (val === null || val === undefined) {
					return null;
				}
				values[key] = val;
			}
			return values;
		};

		return {
			hostWillLoad() {
				if (deps === undefined) {
					cleanup = setup(host);
				} else {
					const values = readValues();
					if (values === null) {
						return;
					}
					prevValues = values;
					cleanup = setup(mergeProxy(host, values));
				}
			},
			hostWillRender() {
				if (deps === undefined) {
					return;
				}
				if (prevValues === undefined) {
					// Setup hasn't run (skipped at hostWillLoad or dep became null) — try now
					const values = readValues();
					if (values === null) {
						return;
					}
					prevValues = values;
					cleanup = setup(mergeProxy(host, values));
				} else {
					// Setup has run — check for dep changes
					const changed = Object.entries(deps).some(([k, ref]) => !Object.is(ref.current, prevValues?.[k]));
					if (!changed) {
						return;
					}
					cleanup?.();
					cleanup = undefined;
					const next = readValues();
					if (next === null) {
						prevValues = undefined;
						return;
					}
					prevValues = next;
					cleanup = setup(mergeProxy(host, next));
				}
			},
			hostDisconnected() {
				cleanup?.();
				cleanup = undefined;
				prevValues = undefined;
			},
		};
	});
}
