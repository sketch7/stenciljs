import { getCurrentHost } from "./context";
import type { ReactiveController } from "./reactive-controller";

/**
 * Registers a `ReactiveController` with the component currently being constructed.
 *
 * Use this as the foundational primitive when authoring custom hooks that do not
 * need to pass `host` explicitly.
 *
 * @example
 * ```ts
 * export function useMouseController(): { x: number; y: number } {
 *   let x = 0, y = 0;
 *   const ctrl: ReactiveController = {
 *     hostConnected() { window.addEventListener('mousemove', handler); },
 *     hostDisconnected() { window.removeEventListener('mousemove', handler); },
 *   };
 *   use(ctrl);
 *   return { get x() { return x; }, get y() { return y; } };
 * }
 * ```
 */
export function use(controller: ReactiveController): void {
	getCurrentHost().addController(controller);
}
