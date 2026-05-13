/**
 * @ssv/stencil-signals — adapters/active.ts
 *
 * Module-level singleton that holds the currently active SignalAdapter.
 * Set once by each entry point (src/index.ts for TC39, src/preact.ts for Preact)
 * before any utilities are invoked.
 *
 * Utilities call `getAdapter()` inside their function bodies (not at module
 * top-level) so the singleton is always populated by the time they run.
 */

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
