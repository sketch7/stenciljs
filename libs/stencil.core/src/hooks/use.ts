import { getElement } from "@stencil/core";

import { getCurrentHost } from "./host-context";
import type {
	ReactiveController,
	ReactiveControllerHost,
	ReactiveHostElement,
	UseHostContext,
} from "./reactive-controller";

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
	factory: (host: UseHostContext) => { hooks: ReactiveController; value: T },
): Omit<T, keyof ReactiveController>;
export function use(
	controllerOrFactory:
		| ReactiveController
		| ((host: UseHostContext) => ReactiveController | { hooks: ReactiveController }),
): void;
export function use<T>(
	controllerOrFactory:
		| ReactiveController
		| ((host: UseHostContext) => ReactiveController | { hooks: ReactiveController; value?: T }),
): Omit<T, keyof ReactiveController> | void {
	const host = getCurrentHost();
	if (typeof controllerOrFactory === "function") {
		const result = controllerOrFactory(createUseHostContext(host));
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

/** @internal Extends `host` in-place with a lazy DOM element resolver, returning it as {@link UseHostContext}. */
function createUseHostContext(host: ReactiveControllerHost): UseHostContext {
	return Object.assign(host, {
		getElement(): ReactiveHostElement {
			try {
				const el = getElement(host as object);
				if (el) {
					return el as unknown as ReactiveHostElement;
				}
			} catch {
				// SSR — getElement is unavailable at construction time; falls through to host cast.
				// The component instance IS the mock DOM element in the hydrate bundle.
				console.error(
					"use() called outside of lifecycle hook; getElement() is unavailable. Returning host as fallback.",
				);
			}
			return host as unknown as ReactiveHostElement;
		},
	});
}
