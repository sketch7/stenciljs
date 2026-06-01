import type { ReactiveControllerHost } from "@ssv/stencil-core";
import type { ComponentInterface, MixedInCtor } from "@stencil/core";

import { useSignalWatcher } from "../controllers/signal-watcher-controller";

/** Mixin factory that patches `render()` to auto-track signal dependencies and re-render on change. */
export function SignalWatcherMixin<TBase extends MixedInCtor<ComponentInterface>>(
	Base: TBase,
): TBase & MixedInCtor<ReactiveControllerHost> {
	class SignalWatcher extends Base {
		// oxlint-disable-next-line typescript/no-explicit-any
		constructor(...args: any[]) {
			super(...args);
			useSignalWatcher();
		}
	}

	return SignalWatcher as unknown as TBase & MixedInCtor<ReactiveControllerHost>;
}
