import { computed } from "@ssv/stencil-signals";
import type { Signal } from "@ssv/stencil-signals";

/** Maps every field of a result object to a read-only signal of that field. */
export type SignalFields<T> = { [K in keyof T]: Signal<T[K]> };

/**
 * Exposes an immutable result held in `source` as lazily-created, memoized per-field computed
 * signals, plus plain `extra` action functions (`mutate`, `refetch`, …).
 *
 * `result.data()` resolves to `computed(() => source().data)` — re-running only when that field
 * changes (computeds bail on `Object.is`), giving fine-grained reactivity without enumerating a
 * key list. Mirrors `@tanstack/angular-query-experimental`'s signal proxy.
 *
 * `extra` keys take precedence, so action names that also appear on the result object (e.g.
 * `refetch`, `reset`) always resolve to the plain function, never a signal.
 */
export function createSignalResult<TResult extends object, TExtra extends object>(
	source: Signal<TResult>,
	extra: TExtra,
): SignalFields<TResult> & TExtra {
	const cache = new Map<string, Signal<unknown>>();
	const extraKeys = new Set(Object.keys(extra));

	return new Proxy(Object.create(null) as SignalFields<TResult> & TExtra, {
		get(_target, prop) {
			if (typeof prop !== "string") {
				return;
			}
			if (extraKeys.has(prop)) {
				return (extra as Record<string, unknown>)[prop];
			}
			let sig = cache.get(prop);
			if (!sig) {
				sig = computed(() => (source() as Record<string, unknown>)[prop]);
				cache.set(prop, sig);
			}
			return sig;
		},
		has(_target, prop) {
			return typeof prop === "string" && (extraKeys.has(prop) || prop in source.peek());
		},
	});
}
