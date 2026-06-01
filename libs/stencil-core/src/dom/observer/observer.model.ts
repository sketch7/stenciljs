// ─── Shared observer types ────────────────────────────────────────────────────

/** A DOM element, a getter returning one, or a getter returning an array of elements. */
export type ObserverTarget = Element | (() => Element | null | undefined) | (() => (Element | null | undefined)[]);

/** Single-element form of {@link ObserverTarget}: an element or a getter returning one. */
export type SingleObserverTarget = Element | (() => Element | null | undefined);

/** Handle returned by observer utilities to stop observation manually. */
export type ObserverRef = {
	/** Stop observing all targets and disconnect the underlying observer. */
	readonly destroy: () => void;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Resolves a single {@link ObserverTarget} entry to a flat array of live elements. */
export function resolveTarget(target: ObserverTarget): Element[] {
	if (typeof target !== "function") {
		return [target];
	}
	const result = target();
	if (Array.isArray(result)) {
		return result.filter((el): el is Element => el !== null && el !== undefined);
	}
	return result ? [result] : [];
}
