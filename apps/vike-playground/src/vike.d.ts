import type { StartupContext } from "@app/stencil-playground/startup-context";

declare global {
	namespace Vike {
		// oxlint-disable-next-line typescript/consistent-type-definitions -- interface merging required for Vike module augmentation
		interface PageContext {
			/** Startup context collected server-side and serialized to the client via `passToClient`. */
			startupContext: StartupContext;
		}
	}
}
