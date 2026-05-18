import { forceUpdate } from "@stencil/core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

import { clearCurrentHost, setCurrentHost } from "./host-context";

/**
 * Lifecycle-aware controller interface for Stencil components.
 * All methods are optional — implement only what you need.
 *
 * @see {@link https://stenciljs.com/docs/component-lifecycle | Stencil Component Lifecycle}
 *
 * @example
 * ```ts
 * const ctrl: ReactiveController = {
 *   hostConnected() { window.addEventListener('resize', onResize); },
 *   hostDisconnected() { window.removeEventListener('resize', onResize); },
 * };
 * ```
 */
export type ReactiveController = {
	/** Called every time the host connects to the DOM. May be called more than once if the element is moved. */
	hostConnected?(): void;
	/** Called every time the host disconnects from the DOM. May be called more than once. */
	hostDisconnected?(): void;
	/** Called once just before the first render. Return a `Promise` to delay rendering. */
	hostWillLoad?(): Promise<void> | void;
	/** Called once just after the first render. */
	hostDidLoad?(): void;
	/** Called before every render. Return a `Promise` to delay rendering. */
	hostWillRender?(): Promise<void> | void;
	/** Called after every render. */
	hostDidRender?(): void;
	/** Called before a re-render when `Prop` or `State` changes. Never called on first render. Return a `Promise` to delay the update. */
	hostWillUpdate?(): Promise<void> | void;
	/** Called after a re-render when `Prop` or `State` changes. Never called on first render. */
	hostDidUpdate?(): void;
};

/**
 * Host API exposed to `ReactiveController`s.
 *
 * @example
 * ```ts
 * host.addController(ctrl);
 * host.requestUpdate();
 * ```
 */
export type ReactiveControllerHost = {
	/** Registers a controller with this host. */
	addController(controller: ReactiveController): void;
	/** Unregisters a controller from this host. */
	removeController(controller: ReactiveController): void;
	/** Schedules a re-render of the host component. */
	requestUpdate(): void;
};

/**
 * Intersection of {@link ReactiveControllerHost} and `HTMLElement`.
 *
 * This is the type of the `host` parameter inside a `use()` factory. At runtime it is the actual
 * DOM element (resolved via `getElement` in lazy builds, identical to `host` in custom-elements builds).
 */
export type ReactiveHostElement = ReactiveControllerHost & HTMLElement;

/**
 * Mixin factory that adds `ReactiveController` support to any Stencil component class.
 *
 * @example
 * ```ts
 * @Component({ tag: 'my-component', shadow: true })
 * export class MyComponent extends Mixin(ReactiveControllerHostMixin) {
 *   #mouse = useMouseController();
 * }
 * ```
 */
export function ReactiveControllerHostMixin<B extends MixedInCtor>(Base: B) {
	class ReactiveControllerHostClass extends Base implements ComponentInterface, ReactiveControllerHost {
		readonly controllers = new Set<ReactiveController>();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript mixin spec requires `any[]`
		constructor(...args: any[]) {
			super(...args);
			setCurrentHost(this as unknown as ReactiveControllerHost);
			queueMicrotask(clearCurrentHost);
		}
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
				return Promise.all(promises).then();
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
				return Promise.all(promises).then();
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
				return Promise.all(promises).then();
			}
		}

		componentDidUpdate(): void {
			this.controllers.forEach(c => c.hostDidUpdate?.());
		}
	}

	return ReactiveControllerHostClass;
}
