import { peekCurrentHost } from "@ssv/stencil-core";

import { getAdapter } from "../adapters/active";
import type { WritableSignal, Signal } from "../adapters/types";
import { getActiveOwner } from "../signals/core";
import { bindToHostEffect } from "./host-bind";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WatcherRef = {
	dispose(): void;
};

export type CleanupFn = () => void;

export type RegisterCleanup = (fn: CleanupFn) => void;

type AnySignal<T = unknown> = WritableSignal<T> | Signal<T>;

type SignalValues<T extends readonly AnySignal[]> = {
	[K in keyof T]: T[K] extends AnySignal<infer V> ? V : never;
};

export type EffectOptions = {
	/**
	 * When `true`, the effect does NOT run immediately on creation.
	 * Only fires on first dep change. Applicable to explicit-deps mode only.
	 */
	defer?: boolean;
};

type EffectCleanupState = {
	pendingCleanup: CleanupFn | null;
	userCleanup: CleanupFn | undefined;
};

// ─── Shared cleanup runner ────────────────────────────────────────────────────

function flushCleanups(state: EffectCleanupState): void {
	state.pendingCleanup?.();
	state.pendingCleanup = null;
	if (typeof state.userCleanup === "function") {
		state.userCleanup();
		state.userCleanup = undefined;
	}
}

function flushAllCleanups(state: EffectCleanupState): void {
	state.pendingCleanup?.();
	state.pendingCleanup = null;
	if (typeof state.userCleanup === "function") {
		state.userCleanup();
		state.userCleanup = undefined;
	}
}

type EffectCleanupRunOptions = {
	/**
	 * When `true` (default), prior run’s cleanups flush before `fn`.
	 * When `false`, prior registrations are dropped without running (host-bound effects).
	 */
	flushBetweenRuns?: boolean;
};

/** Runs user `fn`; captures onCleanup + return per `flushBetweenRuns`. */
function runEffectWithCleanup(
	state: EffectCleanupState,
	fn: (onCleanup: RegisterCleanup) => CleanupFn | void,
	runOptions?: EffectCleanupRunOptions,
): void {
	const flushBetweenRuns = runOptions?.flushBetweenRuns ?? true;
	if (flushBetweenRuns) {
		flushCleanups(state);
	} else {
		state.pendingCleanup = null;
		state.userCleanup = undefined;
	}
	let onCleanupFn: CleanupFn | null = null;
	state.userCleanup = fn(cb => {
		onCleanupFn = cb;
	}) as CleanupFn | undefined;
	if (onCleanupFn) {
		state.pendingCleanup = onCleanupFn;
	}
}

function toWatcherRef(dispose: CleanupFn): WatcherRef {
	return { dispose };
}

const noopWatcherRef: WatcherRef = {
	dispose: () => {
		/* no-op */
	},
};

// ─── effect overloads ─────────────────────────────────────────────────────────

/** Auto-tracking: re-runs whenever any signal read inside `fn` changes. */
export function effect(fn: (onCleanup: RegisterCleanup) => CleanupFn | void): WatcherRef;

/** Explicit-deps: re-runs only when signals in `deps` change. */
export function effect<const Deps extends readonly AnySignal[]>(
	deps: Deps,
	fn: (values: SignalValues<Deps>, onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef;

// ─── effect implementation ────────────────────────────────────────────────────

export function effect(
	fnOrDeps: ((onCleanup: RegisterCleanup) => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
): WatcherRef {
	const hostBound = peekCurrentHost() !== null;
	if (hostBound) {
		return bindToHostEffect({
			utilityName: "effect",
			create: () => createEffectImmediate(fnOrDeps, fn, options, { flushBetweenRuns: false }),
		});
	}
	return createEffectImmediate(fnOrDeps, fn, options, { flushBetweenRuns: true });
}

type CreateEffectMode = {
	flushBetweenRuns: boolean;
};

/** Immediate effect creation; used by `effect()` and `bindToHostEffect.create`. */
function createEffectImmediate(
	fnOrDeps: ((onCleanup: RegisterCleanup) => CleanupFn | void) | readonly AnySignal[],
	fn?: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options?: EffectOptions,
	mode?: CreateEffectMode,
): WatcherRef {
	const flushMode = mode ?? { flushBetweenRuns: true };
	if (typeof fnOrDeps === "function") {
		return autoTrackingEffect(fnOrDeps, flushMode);
	}

	if (!fn) {
		return noopWatcherRef;
	}
	return explicitDepsEffect(fnOrDeps as readonly AnySignal[], fn, options ?? {}, flushMode);
}

// ─── Auto-tracking implementation ─────────────────────────────────────────────
//
// Delegates to the adapter's createEffect() which handles dep tracking
// internally for both TC39 (Signal.Computed + Watcher) and Preact (effect()).

function autoTrackingEffect(fn: (onCleanup: RegisterCleanup) => CleanupFn | void, mode: CreateEffectMode): WatcherRef {
	const ref = getAdapter().createEffect(fn, { flushBetweenRuns: mode.flushBetweenRuns });
	getActiveOwner()?.push(() => ref.dispose());
	return ref;
}

function explicitDepsEffect(
	deps: readonly AnySignal[],
	fn: (values: unknown[], onCleanup: RegisterCleanup) => CleanupFn | void,
	options: EffectOptions,
	mode: CreateEffectMode,
): WatcherRef {
	const adapter = getAdapter();
	const cleanupState: EffectCleanupState = { pendingCleanup: null, userCleanup: undefined };
	let defer = options.defer;
	const runOpts: EffectCleanupRunOptions = { flushBetweenRuns: mode.flushBetweenRuns };

	const innerRef = adapter.createEffect(
		_onCleanup => {
			const values = deps.map(s => s());
			adapter.untrack(() => {
				if (!defer) {
					runEffectWithCleanup(cleanupState, oc => fn(values, oc), runOpts);
				}
				defer = false;
			});
		},
		{ flushBetweenRuns: mode.flushBetweenRuns },
	);

	const ref = toWatcherRef(() => {
		innerRef.dispose();
		flushAllCleanups(cleanupState);
	});
	getActiveOwner()?.push(() => ref.dispose());
	return ref;
}
