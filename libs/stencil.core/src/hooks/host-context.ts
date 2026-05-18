import type { ReactiveControllerHost } from "./reactive-controller";

// State is stored on globalThis (keyed by a Symbol.for) rather than a module-local
// `let` binding. This serves two purposes:
//
// 1. When downstream bundlers (Rollup/Stencil) duplicate this module across
//    chunks, every duplicate reads/writes the same slot. Without this, a chunk
//    where `setCurrentHost` is never called locally would have an isolated
//    `currentHost = null`, and `getCurrentHost()` from that chunk always throws.
// 2. Rollup's constant folding cannot reason across globalThis, so the
//    `if (!currentHost)` check in `getCurrentHost` is preserved (otherwise it
//    can be eliminated to an unconditional throw).
const HOST_KEY = Symbol.for("@ssv/stencil.core:currentHost");

type HostGlobal = { [HOST_KEY]?: ReactiveControllerHost | null };

const hostGlobal = globalThis as unknown as HostGlobal;

/**
 * Sets the current host for implicit hook registration.
 * Called automatically by `ReactiveControllerHostMixin` constructors.
 * Exported for use in tests and custom host implementations.
 */
export function setCurrentHost(host: ReactiveControllerHost): void {
	hostGlobal[HOST_KEY] = host;
}

/** Clears the current host context. Queued as a microtask by `SsvElement` constructors. */
export function clearCurrentHost(): void {
	hostGlobal[HOST_KEY] = null;
}

/**
 * Returns the host currently being constructed, or `null` if none is set.
 * Safer than `getCurrentHost()` when you only need to branch behavior (e.g. bind to lifecycle vs run immediately).
 */
export function peekCurrentHost(): ReactiveControllerHost | null {
	return hostGlobal[HOST_KEY] ?? null;
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
	const host = hostGlobal[HOST_KEY];
	if (!host) {
		throw new Error(
			"Hooks must be called in class field initializers of a ReactiveControllerHost component. " +
				"If you are writing tests, call setCurrentHost(host) before invoking hooks.",
		);
	}
	return host;
}
