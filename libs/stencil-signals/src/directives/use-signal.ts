/**
 * @ssv/stencil-signals — directives/use-signal.ts
 *
 * `@useSignal(sig)` property decorator.
 *
 * Binds a TC39 signal to a class property so reads and writes go through the
 * signal transparently — no `.get()` / `.set()` calls needed at the use site.
 *
 * ## Usage
 *
 * ```ts
 * import { signal } from '@ssv/stencil-signals';
 * import { useSignal } from '@ssv/stencil-signals';
 *
 * const count = signal(0);
 *
 * @Component({ tag: 'my-counter' })
 * export class MyCounter extends SignalWatcher(class {}) {
 *   @useSignal(count)
 *   declare count: number;        // this.count → count()
 *                                 // this.count = x → count.set(x)
 *
 *   render() { return <p>{this.count}</p>; }
 * }
 * ```
 *
 * ## Read-only computed signals
 *
 * ```ts
 * const doubled = computed(() => count() * 2);
 *
 * @useSignal(doubled)
 * declare doubled: number;        // this.doubled → doubled()
 *                                 // this.doubled = x → throws TypeError
 * ```
 *
 * ## Design notes
 *
 * - Uses the Stage 2 legacy `PropertyDecorator` API (`experimentalDecorators: true`).
 * - The descriptor is placed on the **class prototype**, so the signal binding is
 *   shared across all instances — the expected behaviour for module-level signals.
 *   Per-instance bindings require calling `sig()` / `sig.set()` directly.
 */

import type { WritableSignal, Signal } from "../signals/core";

/**
 * Bind a Signal.State or Signal.Computed to a class property.
 *
 * - Reads (`this.prop`) delegate to `sig.get()`.
 * - Writes (`this.prop = x`) delegate to `sig.set(x)` for State signals.
 *   Writing to a Computed signal throws a descriptive TypeError.
 */
export function useSignal<T>(sig: WritableSignal<T> | Signal<T>): PropertyDecorator {
	return function useSignalDecorator(_target: object, propertyKey: string | symbol): void {
		const isWritable = "set" in sig;

		Object.defineProperty(_target, propertyKey, {
			get(): T {
				return sig();
			},
			set(value: T): void {
				if (!isWritable) {
					throw new TypeError(
						`@useSignal: property "${String(propertyKey)}" is bound to a ` +
							`read-only Signal.Computed. Writes are not allowed.`,
					);
				}
				(sig as WritableSignal<T>).set(value);
			},
			enumerable: true,
			configurable: true,
		});
	};
}
