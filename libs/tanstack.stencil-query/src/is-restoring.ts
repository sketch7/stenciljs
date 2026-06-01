import { createContext, createRef, createWritableRef, provideContext, useContext } from "@ssv/stencil-core";
import type { Ref, WritableRef } from "@ssv/stencil-core";

/**
 * Context key used to signal that a persisted query cache is currently being restored.
 *
 * Populated by {@link provideIsRestoring}; consumed by {@link useIsRestoring},
 * {@link useQuery}, {@link useQueries}, and their signals counterparts.
 */
export const isRestoringKey = createContext<WritableRef<boolean>>(() => createWritableRef<boolean>(false), {
	name: "IsRestoring",
});

/**
 * Provides an `isRestoring` flag to all descendant components.
 *
 * Returns a {@link WritableRef} whose `.current` can be set to `true` while
 * a persisted cache is being restored and back to `false` when restoration completes.
 * Descendant components automatically receive `_optimisticResults: 'isRestoring'` while
 * the flag is `true`, preventing refetch storms during hydration.
 *
 * @example
 * ```ts
 * export class AppRoot extends SsvElement {
 *   readonly #isRestoring = provideIsRestoring();
 *
 *   async componentWillLoad() {
 *     this.#isRestoring.current = true;
 *     await restorePersistedCache(this.#queryClient);
 *     this.#isRestoring.current = false;
 *     this.requestUpdate();
 *   }
 * }
 * ```
 */
export function provideIsRestoring(initial = false): WritableRef<boolean> {
	const ref = createWritableRef<boolean>(initial);
	provideContext(isRestoringKey, ref);
	return ref;
}

/**
 * Returns the nearest ancestor's `isRestoring` flag as a {@link Ref}.
 *
 * Falls back to `false` when no {@link provideIsRestoring} ancestor exists — safe
 * to call in any component without a wrapping provider.
 *
 * @example
 * ```ts
 * readonly #isRestoring = useIsRestoring();
 *
 * render() {
 *   if (this.#isRestoring.current) return <span>Restoring…</span>;
 *   // …
 * }
 * ```
 */
export function useIsRestoring(): Ref<boolean> {
	const ctxRef = useContext(isRestoringKey); // Ref<WritableRef<boolean>>
	// Wrap in createRef so `.current` reads through the inner ref lazily.
	// ctxRef.current may be undefined before hostConnected; fall back to false.
	return createRef(() => ctxRef.current?.current ?? false);
}
