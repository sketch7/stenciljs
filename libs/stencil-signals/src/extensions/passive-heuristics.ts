/**
 * Passive listener defaults mirrored from Stencil's compiler (`parseListener` in
 * `@stencil/core` compiler/stencil.js, `PASSIVE_TRUE_DEFAULTS`, v4.43.4).
 *
 * When `passive` is omitted on `@Listen` / `signalFromEvent`, Stencil sets
 * `passive: true` for these event names (case-insensitive).
 */

/** Event names that default to `{ passive: true }` when `passive` is omitted. */
export const PASSIVE_TRUE_DEFAULTS: ReadonlySet<string> = new Set([
	"dragstart",
	"drag",
	"dragend",
	"dragenter",
	"dragover",
	"dragleave",
	"drop",
	"mouseenter",
	"mouseover",
	"mousemove",
	"mousedown",
	"mouseup",
	"mouseleave",
	"mouseout",
	"mousewheel",
	"pointerover",
	"pointerenter",
	"pointerdown",
	"pointermove",
	"pointerup",
	"pointercancel",
	"pointerout",
	"pointerleave",
	"resize",
	"scroll",
	"touchstart",
	"touchmove",
	"touchend",
	"touchenter",
	"touchleave",
	"touchcancel",
	"wheel",
]);

/** Resolve the `passive` flag the same way Stencil's `@Listen` compiler pass does. */
export function resolvePassiveOption(eventName: string, passive?: boolean): boolean {
	if (typeof passive === "boolean") {
		return passive;
	}
	return PASSIVE_TRUE_DEFAULTS.has(eventName.trim().toLowerCase());
}

/** `addEventListener` / `removeEventListener` options matching `capture` + `passive`. */
export function toAddEventListenerOptions(capture: boolean, passive: boolean): boolean | AddEventListenerOptions {
	if (capture || passive) {
		return { capture, passive };
	}

	return false;
}
