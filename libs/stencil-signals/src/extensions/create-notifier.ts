import type { Signal } from "../adapters/types";
import { signal } from "../signals/core";
import { effect } from "./effect";

export type CreateNotifierOptions = {
	deps?: Signal<unknown>[];
	depsEmitInitially?: boolean;
};

export type Notifier = {
	notify(): void;
	listen: Signal<number>;
};

/**
 * Creates a signal notifier that can be used to trigger effects or other reactive consumers.
 *
 * - `notify()` — imperatively increment the counter, waking all listeners.
 * - `listen` — read-only signal consumers track; re-runs their effect on each `notify()` or dep change.
 *
 * When `deps` are provided, every dep change also increments the counter.
 * `depsEmitInitially` (default `true`) starts the counter at 1 so the first dep read notifies
 * downstream; set to `false` to start at 0 and only notify on changes.
 */
export function createNotifier(options?: CreateNotifierOptions): Notifier {
	const deps = options?.deps ?? [];
	const depsEmitInitially = options?.depsEmitInitially ?? true;

	const initialValue = deps.length > 0 && depsEmitInitially ? 1 : 0;
	const counter = signal<number>(initialValue);

	if (deps.length > 0) {
		let isFirst = true;
		effect(() => {
			deps.forEach(dep => dep());
			if (isFirst) {
				isFirst = false;
				return;
			}
			counter.update(v => v + 1);
		});
	}

	return {
		notify: () => counter.update(v => v + 1),
		listen: counter.asReadonly(),
	};
}
