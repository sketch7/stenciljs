import type { ReactiveControllerHost } from "./reactive-controller";

let currentHost: ReactiveControllerHost | null = null;

/**
 * Sets the current host for implicit hook registration.
 * Called automatically by `ReactiveControllerHostMixin` constructors.
 * Exported for use in tests and custom host implementations.
 */
export function setCurrentHost(host: ReactiveControllerHost): void {
	currentHost = host;
}

/** Clears the current host context. Queued as a microtask by `SsvElement` constructors. */
export function clearCurrentHost(): void {
	currentHost = null;
}

/**
 * Returns the host currently being constructed, or `null` if none is set.
 * Safer than `getCurrentHost()` when you only need to branch behavior (e.g. bind to lifecycle vs run immediately).
 */
export function peekCurrentHost(): ReactiveControllerHost | null {
	return currentHost;
}

/** Returns `true` when called within a component constructor (reactive context). */
export function isInReactiveContext(): boolean {
	return peekCurrentHost() !== null;
}

/**
 * Throws if not called within a reactive context.
 * Use for utilities that strictly require lifecycle binding.
 */
export function ensureReactiveContext(): void {
	if (!isInReactiveContext()) {
		throw new Error(
			"Must be called within a component's reactive context (class field initializer). " +
				"If you are writing tests, call setCurrentHost(host) before invoking hooks.",
		);
	}
}

/**
 * Returns the host currently being constructed.
 * Throws if called outside a component constructor context.
 *
 * Low-level primitive. Prefer `use()` for authoring hooks.
 * Use `getCurrentHost()` directly only when you need the host reference outside a `use()` factory
 * (e.g. in tests or custom host implementations).
 *
 * @example
 * ```ts
 * // In tests: set the host manually before invoking hooks
 * setCurrentHost(mockHost);
 * const result = useMyController();
 * ```
 */
export function getCurrentHost(): ReactiveControllerHost {
	if (!currentHost) {
		throw new Error(
			"Hooks must be called in class field initializers of a ReactiveControllerHost component. " +
				"If you are writing tests, call setCurrentHost(host) before invoking hooks.",
		);
	}
	return currentHost;
}
