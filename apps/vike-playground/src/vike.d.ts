import type { StartupContext } from "@app/stencil-playground/startup-context";

declare global {
	namespace Vike {
		interface PageContext {
			/** Startup context collected server-side and serialized to the client via `passToClient`. */
			startupContext: StartupContext;
		}
	}
}
