import { getElement } from "@stencil/core";

import { getCurrentHost } from "./host-context";
import type { ReactiveController, ReactiveControllerHost, ReactiveHostElement } from "./reactive-controller";

/**
 * Registers a `ReactiveController` with the component currently being constructed.
 *
 * **Factory form (with value)** — preferred when the hook exposes state: return `{ hooks, value }`.
 * `hooks` is registered as the controller; `value` is returned with lifecycle keys stripped.
 * Using a dedicated `hooks` key means TypeScript's excess-property check catches lifecycle typos.
 *
 * @example
 * ```ts
 * export function useMouseController() {
 *   return use((host) => {
 *     let pos = { x: 0, y: 0 };
 *     const onMove = (e: MouseEvent) => { pos = { x: e.clientX, y: e.clientY }; host.requestUpdate(); };
 *     return {
 *       hooks: {
 *         hostConnected() { window.addEventListener('mousemove', onMove); },
 *         hostDisconnected() { window.removeEventListener('mousemove', onMove); },
 *       },
 *       value: { get pos() { return pos; } },
 *     };
 *   });
 * }
 * ```
 *
 * **Factory form (side-effects only)** — return a `ReactiveController` directly when no value is needed.
 *
 * @example
 * ```ts
 * use((host) => ({
 *   hostConnected() { window.addEventListener('resize', onResize); },
 *   hostDisconnected() { window.removeEventListener('resize', onResize); },
 * }));
 * ```
 *
 * **Controller form** — pass a pre-built controller when you don't need a return value.
 *
 * @example
 * ```ts
 * use({ hostConnected() { ... }, hostDisconnected() { ... } });
 * ```
 */
export function use<T>(
	factory: (host: ReactiveHostElement) => { hooks: ReactiveController; value: T },
): Omit<T, keyof ReactiveController>;
export function use(
	controllerOrFactory:
		| ReactiveController
		| ((host: ReactiveHostElement) => ReactiveController | { hooks: ReactiveController }),
): void;
export function use<T>(
	controllerOrFactory:
		| ReactiveController
		| ((host: ReactiveHostElement) => ReactiveController | { hooks: ReactiveController; value?: T }),
): Omit<T, keyof ReactiveController> | void {
	const host = getCurrentHost();
	if (typeof controllerOrFactory === "function") {
		const result = controllerOrFactory(resolveHostElement(host));
		if ("hooks" in result) {
			host.addController(result.hooks);
			if ("value" in result) {
				return result.value as Omit<T, keyof ReactiveController>;
			}
			return;
		}
		host.addController(result);
		return;
	}
	host.addController(controllerOrFactory);
}

/** @internal Resolves the actual DOM element for the host, merging ReactiveControllerHost methods in lazy builds. */
function resolveHostElement(host: ReactiveControllerHost): ReactiveHostElement {
	try {
		const el = getElement(host as object);
		if (el) {
			if ((el as unknown) !== host) {
				// Lazy-load build: host is the lazy instance, el is the actual DOM element.
				// Bind ReactiveControllerHost methods onto el so the factory receives a fully typed ReactiveHostElement.
				const h = el as unknown as ReactiveControllerHost;
				h.addController = host.addController.bind(host);
				h.removeController = host.removeController.bind(host);
				h.requestUpdate = host.requestUpdate.bind(host);
			}
			return el as unknown as ReactiveHostElement;
		}
	} catch {
		// SSR context — getElement is unavailable; fall through to host cast
	}
	return host as unknown as ReactiveHostElement;
}
