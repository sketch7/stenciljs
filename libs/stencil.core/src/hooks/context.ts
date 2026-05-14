import type { ReactiveControllerHost } from "./reactive-controller";

let currentHost: ReactiveControllerHost | null = null;

/**
 * Sets the current host for implicit hook registration.
 * Called automatically by `SsvElement` / `SsvElementMixin` constructors.
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
 * Returns the host currently being constructed.
 * Throws if called outside a component constructor context.
 *
 * @example
 * ```ts
 * export function useMyController(): () => number {
 *   const host = getCurrentHost();
 *   host.addController(ctrl);
 *   return () => value;
 * }
 * ```
 */
export function getCurrentHost(): ReactiveControllerHost {
	if (!currentHost) {
		throw new Error(
			"Hooks must be called in class field initializers of an SsvElement component. " +
				"If you are writing tests, call setCurrentHost(host) before invoking hooks.",
		);
	}
	return currentHost;
}
