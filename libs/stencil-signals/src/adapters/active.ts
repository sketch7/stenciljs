import type { SignalAdapter } from "./types";

let _adapter: SignalAdapter | null = null;

/**
 * Configure the active adapter. Called once per entry point.
 * @internal
 */
export function _setAdapter(adapter: SignalAdapter): void {
	_adapter = adapter;
}

/**
 * Return the active adapter. Throws if called before an entry point has
 * configured one (which would be a consumer bug — import the library entry
 * point before using any primitives).
 */
export function getAdapter(): SignalAdapter {
	if (_adapter === null) {
		throw new Error(
			"@ssv/stencil-signals: no signal adapter is configured. " +
				'Import from "@ssv/stencil-signals" (TC39) or ' +
				'"@ssv/stencil-signals/preact" (Preact).',
		);
	}
	return _adapter;
}
