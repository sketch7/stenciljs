import type { ContextRef } from "./context/context";

/**
 * A callable reactive reference. Read the live value by invoking it or via `.current`.
 * Extends {@link ContextRef} — compatible anywhere a `ContextRef<T>` is expected.
 *
 * @example
 * ```ts
 * const ref = createRef(() => observer.getCurrentResult());
 * ref()         // call to read current value
 * ref.current   // property access — same value
 * ```
 */
export type Ref<T> = (() => T) & ContextRef<T>;

/**
 * Creates a {@link Ref} backed by `getter`. `getter` is called each time the ref is read.
 *
 * @example
 * ```ts
 * const postsRef = createRef(() => observer.getCurrentResult());
 * ```
 */
export function createRef<T>(getter: () => T): Ref<T> {
	const fn = () => getter();
	Object.defineProperty(fn, "current", { get: getter, enumerable: true });
	return fn as Ref<T>;
}
