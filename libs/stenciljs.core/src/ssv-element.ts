import type { MixedInCtor } from "@stencil/core";
import { Mixin } from "@stencil/core";

import { ReactiveControllerHostMixin } from "./reactive-controller";

/**
 * Abstract class version of {@link SsvElementMixin} for simple single-inheritance usage.
 *
 * Use this when you don't need to compose with other mixins:
 * ```ts
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends SsvElement {
 *   private mouse = withMouseController(this);
 * }
 * ```
 *
 * When you need mixin composition, use {@link SsvElementMixin} with Stencil's `Mixin()` helper instead.
 */
export class SsvElement extends Mixin(ReactiveControllerHostMixin) {}

/**
 * Convenience mixin that bundles `ReactiveControllerHostMixin`.
 *
 * Use with Stencil's `Mixin()` helper:
 * ```ts
 * import { Mixin } from '@stencil/core';
 * import { SsvElementMixin } from '@ssv/stenciljs.core';
 *
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends Mixin(SsvElementMixin) {
 *   private mouse = withMouseController(this);
 * }
 * ```
 */
export function SsvElementMixin<B extends MixedInCtor>(Base: B) {
	return ReactiveControllerHostMixin(Base);
}
