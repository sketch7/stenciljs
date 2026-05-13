import type { SignalAdapter } from "./types";

export async function detectAdapter(): Promise<SignalAdapter> {
	try {
		const { tc39Adapter } = await import("./tc39");
		return tc39Adapter;
	} catch {
		/* signal-polyfill not installed */
	}

	try {
		const { preactAdapter } = await import("./preact");
		return preactAdapter;
	} catch {
		/* @preact/signals-core not installed */
	}

	throw new Error(
		"@ssv/stencil-signals: no signal backend found. " +
			"Install signal-polyfill (TC39) or @preact/signals-core (Preact) as a peer dependency.",
	);
}
