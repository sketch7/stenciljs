import { untracked } from "../signals/core";
import { effect } from "./effect";
import type { WatcherRef } from "./effect";

/**
 * Creates an effect that watches `condition` and executes `execution` exactly once
 * when the condition returns a truthy / non-nullish value, then disposes itself.
 */
export function effectOnceIf<T>(condition: () => T, execution: (value: NonNullable<T>) => void): WatcherRef {
	let firedOnFirstRun = false;
	let isSetup = false;

	const innerRef = effect(() => {
		const value = condition();
		if (value) {
			untracked(() => execution(value));
			// Only dispose if setup has completed (innerRef is assigned).
			// During TC39 synchronous first run, isSetup is still false.
			if (isSetup) {
				innerRef.dispose();
			} else {
				firedOnFirstRun = true;
			}
		}
	});

	// Mark that innerRef is now assigned and safe to use.
	isSetup = true;

	if (firedOnFirstRun) {
		innerRef.dispose();
	}

	return innerRef;
}
