/**
 * @ssv/stencil-signals — mixins/signal-watcher.ts
 *
 * `SignalWatcher` makes any StencilJS component automatically re-render
 * whenever a signal accessed during `render()` changes.
 *
 * Thin composition shell:
 *  - Requires `Base` to already implement `ReactiveControllerHost` (e.g. via `SsvElementMixin`)
 *  - Installs `SignalWatcherController` via `withSignalController` in the constructor
 *
 * @example
 * ```ts
 * // Compose with SsvElementMixin to provide the controller host:
 * export class MyComponent extends Mixin(SignalWatcherMixin, SsvElementMixin) {}
 *
 * // Or extend SsvElement directly + add the controller as a field:
 * export class MyComponent extends SsvElement {
 *   readonly signalWatcher = withSignalController(this);
 * }
 * ```
 */

import type { ReactiveControllerHost } from "@ssv/stencil.core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

import { useSignalController } from "../controllers/signal-watcher-controller";

export function SignalWatcherMixin<TBase extends MixedInCtor<ComponentInterface>>(
	Base: TBase,
): TBase & MixedInCtor<ReactiveControllerHost> {
	class SignalWatcher extends Base {
		constructor(...args: unknown[]) {
			super(...args);
			useSignalController();
		}
	}

	return SignalWatcher as unknown as TBase & MixedInCtor<ReactiveControllerHost>;
}
