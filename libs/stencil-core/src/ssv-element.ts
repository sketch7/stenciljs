import type { MixedInCtor } from "@stencil/core";

import { ReactiveControllerHostMixin } from "./hooks/reactive-controller";

/**
 * Default host base for {@link SsvElement}.
 *
 * Do not use Stencil's `Mixin(ReactiveControllerHostMixin)` here: in bundled output the
 * `Mixin` helper closes over Stencil's `baseClass`, which may not be initialized yet when
 * this module runs (SSR / smaller chunks), producing `extends undefined`.
 *
 * Prefer `HTMLElement` when present (browser); use a minimal stub in DOM-less runtimes.
 */
// oxlint-disable-next-line typescript-eslint/no-extraneous-class -- constructible stub used as `extends` base for SSR
class DomlessStencilHostBase {}

const defaultStencilHostBase: MixedInCtor =
	typeof globalThis !== "undefined" && typeof globalThis.HTMLElement === "function"
		? (globalThis.HTMLElement as unknown as MixedInCtor)
		: (DomlessStencilHostBase as unknown as MixedInCtor);

/**
 * Base class for Stencil components that host `ReactiveController`s.
 *
 * @example
 * ```ts
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends SsvElement {
 *   private mouse = useMouseController();
 * }
 * ```
 *
 * For mixin composition, use {@link SsvElementMixin} with Stencil's `Mixin()` helper instead.
 */
export class SsvElement extends ReactiveControllerHostMixin(defaultStencilHostBase) {}

/**
 * Composable mixin version of {@link SsvElement} for use with Stencil's `Mixin()` helper.
 *
 * @example
 * ```ts
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends Mixin(SsvElementMixin) {
 *   private mouse = useMouseController();
 * }
 * ```
 */
export function SsvElementMixin<B extends MixedInCtor>(Base: B) {
	return ReactiveControllerHostMixin(Base);
}
