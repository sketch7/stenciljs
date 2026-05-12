import type { MixedInCtor } from "@stencil/core";

import { ReactiveControllerHostMixin } from "./reactive-controller.js";

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
