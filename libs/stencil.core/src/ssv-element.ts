import type { MixedInCtor } from "@stencil/core";
import { Mixin } from "@stencil/core";

import { ReactiveControllerHostMixin } from "./hooks/reactive-controller";

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
export class SsvElement extends Mixin(ReactiveControllerHostMixin) { }

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
