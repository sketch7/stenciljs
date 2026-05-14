import { getCurrentHost } from "./context";
import type { ReactiveController, ReactiveControllerHost } from "./reactive-controller";

/**
 * Registers a `ReactiveController` with the component currently being constructed.
 *
 * **Factory form** — preferred: pass a factory that receives `host` and returns
 * `{ hooks: ReactiveController; value: T }`. The `hooks` object is registered as the
 * controller; `value` is returned to the caller with lifecycle methods stripped from its type.
 * Omit `value` when the hook has no public API (side-effects only).
 *
 * Using a dedicated `hooks` key means TypeScript's excess-property check catches lifecycle
 * method typos (e.g. `hostDisconnectedX`) at compile time.
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
 * **Controller form** — pass a pre-built controller when you don't need a return value.
 *
 * @example
 * ```ts
 * use({ hostConnected() { ... }, hostDisconnected() { ... } });
 * ```
 */
export function use<T>(
	factory: (host: ReactiveControllerHost) => { hooks: ReactiveController; value: T },
): Omit<T, keyof ReactiveController>;
export function use(
	controllerOrFactory: ReactiveController | ((host: ReactiveControllerHost) => { hooks: ReactiveController }),
): void;
export function use<T>(
	controllerOrFactory:
		| ReactiveController
		| ((host: ReactiveControllerHost) => { hooks: ReactiveController; value?: T }),
): Omit<T, keyof ReactiveController> | void {
	const host = getCurrentHost();
	if (typeof controllerOrFactory === "function") {
		const result = controllerOrFactory(host);
		host.addController(result.hooks);
		if ("value" in result) {
			return result.value as Omit<T, keyof ReactiveController>;
		}
		return;
	}
	host.addController(controllerOrFactory);
}
