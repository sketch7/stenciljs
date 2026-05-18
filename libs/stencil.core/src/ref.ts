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
 * A callable writable reference. Set `.current` directly; call `.asReadonly()` to get
 * the public {@link Ref} view.
 *
 * @example
 * ```ts
 * const ref = createWritableRef<string>();
 * ref.current = "hello";
 * return ref.asReadonly();
 * ```
 */
export type WritableRef<T> = {
	(): T;
	current: T;
	asReadonly(): Ref<T>;
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
	Object.defineProperty(fn, "current", { get: getter, enumerable: true });
	return fn as Ref<T>;
}

/**
 * Creates a {@link WritableRef} backed by an internal value cell.
 * Assign `.current` imperatively, then expose via `.asReadonly()`.
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

	const fn = (() => _value) as WritableRef<T>;
	Object.defineProperty(fn, "current", {
		get: getter,
		set: (v: T) => {
			_value = v;
		},
		enumerable: true,
	});

	const readonly = createRef(getter);
	fn.asReadonly = () => readonly;

	return fn;
}
