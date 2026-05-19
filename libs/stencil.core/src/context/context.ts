import type { Ref } from "../ref";

/** Internal custom-event name used to propagate context through the DOM tree. */
export const CONTEXT_EVENT = "__ssv:context-request" as const;

/**
 * Internal event dispatched on `window` when a provider connects.
 * Allows consumers that connected before their provider to retry context resolution.
 */
export const PROVIDER_CONNECTED_EVENT = "__ssv:provider-connected" as const;

/** @internal Payload carried by a `CONTEXT_EVENT` custom event. */
export type ContextEventDetail<T> = {
	readonly contextId: symbol;
	callback(value: T): void;
};

/** @internal Payload carried by a `PROVIDER_CONNECTED_EVENT` window event. */
export type ProviderConnectedDetail = { readonly contextId: symbol };

/**
 * Opaque token that uniquely identifies a context type.
 * Create one with {@link createContext}; pass it to {@link provideContext} and {@link useContext}.
 */
export type ContextKey<T> = {
	/** Unique symbol used to match provider and consumer events at runtime. */
	readonly id: symbol;
	/** Human-readable name shown in error messages. */
	readonly name: string;
	/**
	 * Returns the shared singleton fallback value.
	 * Created lazily from `defaultFactory` on first call, then cached.
	 * Throws if the context was created without a `defaultFactory`.
	 */
	getDefault(): T;
	/**
	 * Creates a fresh instance from `defaultFactory` (no caching).
	 * Used by {@link provideContext} when called without an explicit value.
	 * Throws if the context was created without a `defaultFactory`.
	 */
	createInstance(): T;
};

/**
 * A stable reference to a context value. Callable and readable via `.current`.
 * Alias of {@link Ref} — compatible anywhere a `Ref<T>` is expected.
 */
export type ContextRef<T> = Ref<T>;

/**
 * Creates a typed context token.
 *
 * @param defaultFactory - Optional factory called to produce the shared singleton fallback
 *   used by consumers that have no ancestor provider.  Called at most once and cached.
 * @param options.name - Debug label shown in error messages.
 *
 * @example
 * ```ts
 * export const CounterContext = createContext<CounterStore>(
 *   () => createCounterStore(),
 *   { name: 'counter' },
 * );
 * ```
 */
export function createContext<T>(defaultFactory?: () => T, options?: { name?: string; }): ContextKey<T> {
	const displayName = options?.name ?? "(unnamed)";
	let singleton: T | undefined;
	let initialized = false;

	return {
		id: Symbol(displayName),
		name: displayName,
		getDefault(): T {
			if (!defaultFactory) {
				throw new Error(
					`[ssv:context] Context '${displayName}' has no default factory. ` +
						`Add a provideContext() call in an ancestor component or pass a defaultFactory to createContext().`,
				);
			}
			if (!initialized) {
				singleton = defaultFactory();
				initialized = true;
			}
			return singleton as T;
		},
		createInstance(): T {
			if (!defaultFactory) {
				throw new Error(
					`[ssv:context] Context '${displayName}' has no default factory. ` +
						`Pass an explicit value or factory to provideContext().`,
				);
			}
			return defaultFactory();
		},
	};
}
