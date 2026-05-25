import type { ReactiveControllerHost } from "@ssv/stencil-core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

import { useSignalWatcher } from "../controllers/signal-watcher-controller";

/** Mixin factory that patches `render()` to auto-track signal dependencies and re-render on change. */
export function SignalWatcherMixin<TBase extends MixedInCtor<ComponentInterface>>(
	Base: TBase,
): TBase & MixedInCtor<ReactiveControllerHost> {
	class SignalWatcher extends Base {
		constructor(...args: unknown[]) {
			super(...args);
			useSignalWatcher();
		}
	}

	return SignalWatcher as unknown as TBase & MixedInCtor<ReactiveControllerHost>;
}
