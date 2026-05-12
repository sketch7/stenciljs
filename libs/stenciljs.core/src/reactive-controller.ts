import { forceUpdate } from "@stencil/core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

/**
 * Interface for controllers that hook into a host component's lifecycle.
 * All methods are optional — implement only what you need.
 */
export interface ReactiveController {
	hostConnected?(): void;
	hostDisconnected?(): void;
	hostWillLoad?(): Promise<void> | void;
	hostDidLoad?(): void;
	hostWillRender?(): Promise<void> | void;
	hostDidRender?(): void;
	hostWillUpdate?(): Promise<void> | void;
	hostDidUpdate?(): void;
}

/**
 * The host API exposed to ReactiveControllers.
 */
export interface ReactiveControllerHostInterface {
	addController(controller: ReactiveController): void;
	removeController(controller: ReactiveController): void;
	requestUpdate(): void;
}

/**
 * Mixin factory that adds reactive controller support to a Stencil component.
 *
 * Use this with Stencil's `Mixin()` helper:
 * ```ts
 * import { Mixin } from '@stencil/core';
 * import { ReactiveControllerHostMixin } from '@ssv/stenciljs.core';
 *
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends Mixin(ReactiveControllerHostMixin) {
 *   private mouse = withMouseController(this);
 * }
 * ```
 */
export function ReactiveControllerHostMixin<B extends MixedInCtor>(Base: B) {
	class ReactiveControllerHostClass extends Base implements ComponentInterface, ReactiveControllerHostInterface {
		readonly controllers = new Set<ReactiveController>();

		addController(controller: ReactiveController): void {
			this.controllers.add(controller);
		}

		removeController(controller: ReactiveController): void {
			this.controllers.delete(controller);
		}

		requestUpdate(): void {
			forceUpdate(this);
		}

		// ── Stencil lifecycle → controller hooks ─────────────────────────────────

		connectedCallback(): void {
			this.controllers.forEach(c => c.hostConnected?.());
		}

		disconnectedCallback(): void {
			this.controllers.forEach(c => c.hostDisconnected?.());
		}

		componentWillLoad(): Promise<void> | void {
			const promises: Promise<void>[] = [];
			this.controllers.forEach(c => {
				const result = c.hostWillLoad?.();
				if (result) {
					promises.push(result);
				}
			});
			if (promises.length > 0) {
				return Promise.all(promises).then(() => void 0);
			}
		}

		componentDidLoad(): void {
			this.controllers.forEach(c => c.hostDidLoad?.());
		}

		componentWillRender(): Promise<void> | void {
			const promises: Promise<void>[] = [];
			this.controllers.forEach(c => {
				const result = c.hostWillRender?.();
				if (result) {
					promises.push(result);
				}
			});
			if (promises.length > 0) {
				return Promise.all(promises).then(() => void 0);
			}
		}

		componentDidRender(): void {
			this.controllers.forEach(c => c.hostDidRender?.());
		}

		componentWillUpdate(): Promise<void> | void {
			const promises: Promise<void>[] = [];
			this.controllers.forEach(c => {
				const result = c.hostWillUpdate?.();
				if (result) {
					promises.push(result);
				}
			});
			if (promises.length > 0) {
				return Promise.all(promises).then(() => void 0);
			}
		}

		componentDidUpdate(): void {
			this.controllers.forEach(c => c.hostDidUpdate?.());
		}
	}

	return ReactiveControllerHostClass;
}
