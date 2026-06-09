/**
 * A callable reactive reference. Read the live value by invoking it or via `.current`.
 *
 * @example
 * ```ts
 * const ref = createRef(() => observer.getCurrentResult());
 * ref()         // call to read current value
 * ref.current   // property access — same value
 * ```
 */
export type Ref<T> = (() => T) & { readonly current: T };

/**
 * A callable writable reference — a {@link Ref} with a settable `current`.
 * Set `.current` directly; expose via `.asReadonly()` for the public API.
 *
 * @example
 * ```ts
 * const ref = createWritableRef<string>();
 * ref.current = "hello";
 * return ref.asReadonly();
 * ```
 */
export type WritableRef<T> = Omit<Ref<T>, "current"> & {
	current: T;
	/** Returns a read-only {@link Ref} view. The same object instance, narrowed to `Ref<T>`. */
	asReadonly: () => Ref<T>;
};

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
	Object.defineProperty(fn, "current", { get: getter, enumerable: true, configurable: true });
	return fn as Ref<T>;
}

/**
 * Returns `true` when `value` is a {@link Ref}.
 *
 * @example
 * ```ts
 * function useQueryClient(client?: QueryClient | Ref<QueryClient>): Ref<QueryClient> {
 *   if (isRef(client)) return client;
 *   // ...
 * }
 * ```
 */
export function isRef<T>(value: unknown): value is Ref<T> {
	return typeof value === "function" && "current" in (value as object);
}

/**
 * Creates a {@link WritableRef} backed by an internal value cell.
 * Starts from a {@link Ref} and extends it with a setter and `.asReadonly()` —
 * the same function object serves both roles.
 *
 * @example
 * ```ts
 * const ref = createWritableRef<QueryClient>();
 * ref.current = client;
 * return ref.asReadonly();
 * ```
 */
export function createWritableRef<T>(initial?: T): WritableRef<T> {
	let _value = initial as T;
	const getter = () => _value;

	// Build the base Ref first, then upgrade it with write capability.
	// The same function object serves as both WritableRef and Ref (via asReadonly).
	const ref = createRef(getter) as unknown as WritableRef<T>;
	Object.defineProperty(ref, "current", {
		get: getter,
		set: (v: T) => {
			_value = v;
		},
		enumerable: true,
		configurable: true,
	});
	ref.asReadonly = () => ref as unknown as Ref<T>;

	return ref;
}
