/**
 * @ssv/stencil-signals — utils/computed-previous.ts
 *
 * `computedPrevious(sig)` returns a read-only signal whose value is always
 * the *previous* value of the source signal — i.e. the value it held before
 * the most recent change.
 *
 * On the very first read, before any change has occurred, the previous value
 * is `undefined` (or the explicit `initialValue` you supply).
 *
 * ## Usage
 *
 * ```ts
 * const count = signal(0);
 * const prevCount = computedPrevious(count);
 *
 * prevCount.get(); // undefined  (no prior value yet)
 * count.set(5);
 * prevCount.get(); // 0          (the value before the last set)
 * count.set(10);
 * prevCount.get(); // 5
 * ```
 *
 * ### With an explicit initial value
 *
 * ```ts
 * const prevCount = computedPrevious(count, -1);
 * prevCount.get(); // -1  (before any change)
 * ```
 *
 * ### In a component (e.g. for transition direction)
 *
 * ```ts
 * const page = signal(0);
 * const prevPage = computedPrevious(page);
 *
 * render() {
 *   const direction = page.get() > (prevPage.get() ?? 0) ? 'forward' : 'back';
 *   return <div class={direction}>...</div>;
 * }
 * ```
 */

import { getAdapter } from "../adapters/active";
import type { Signal } from "../adapters/types";
import type { WatcherRegistrar } from "../mixins/signal-watcher";
import { scheduler, getActiveOwner } from "../signals/core";
import type { DisposableSignal } from "./computed-async";

/**
 * Returns a signal that always holds the previous value of `source`.
 *
 * Pass `host` (the component `this`) as the **first** argument to enable
 * automatic dispose-on-disconnect / reinit-on-reconnect lifecycle management.
 *
 * @param source       Any readable signal (State or Computed).
 * @param initialValue Value returned before the first change. Defaults to `undefined`.
 */
export function computedPrevious<T>(host: WatcherRegistrar, source: Signal<T>): DisposableSignal<T | undefined>;
export function computedPrevious<T>(source: Signal<T>, initialValue?: T): DisposableSignal<T | undefined>;
export function computedPrevious<T>(
	hostOrSource: WatcherRegistrar | Signal<T>,
	sourceOrInitialValue?: Signal<T> | T,
): DisposableSignal<T | undefined> {
	// Host-first overload: computedPrevious(host, source)
	if (typeof (hostOrSource as WatcherRegistrar).__addWatcher === "function") {
		const host = hostOrSource as WatcherRegistrar;
		const source = sourceOrInitialValue as Signal<T>;
		return _computedPreviousWithHost(source, undefined, host);
	}
	// Standard overload: computedPrevious(source, initialValue?)
	const source = hostOrSource as Signal<T>;
	const initialValue = sourceOrInitialValue as T | undefined;
	return _computedPreviousCore(source, initialValue);
}

// ─── Host path ────────────────────────────────────────────────────────────────

function _computedPreviousWithHost<T>(
	source: Signal<T>,
	initialValue: T | undefined,
	host: WatcherRegistrar,
): DisposableSignal<T | undefined> {
	let inner = _computedPreviousCore<T>(source, initialValue);
	let isDisposed = false;

	const wrapper = Object.assign(() => inner(), {
		peek(): T | undefined {
			return inner.peek();
		},
		dispose(): void {
			if (isDisposed) {
				return;
			}
			isDisposed = true;
			inner.dispose();
		},
	}) as DisposableSignal<T | undefined>;

	function reinit(): void {
		if (!isDisposed) {
			return;
		}
		inner = _computedPreviousCore<T>(source, initialValue);
		isDisposed = false;
	}

	host.__addWatcher({ dispose: wrapper.dispose.bind(wrapper), reinit });

	return wrapper;
}

// ─── Core factory (no host) ───────────────────────────────────────────────────

function _computedPreviousCore<T>(source: Signal<T>, initialValue?: T): DisposableSignal<T | undefined> {
	const adapter = getAdapter();

	// We store previous in a plain signal state so the computed can read it
	// without creating a circular dependency.
	const prev = adapter.createState<T | undefined>(initialValue);

	// Track the last seen value — updated each time the source changes.
	// Initialised to the current source value so the first change is detected.
	let lastSeen: T | undefined = adapter.untrack(() => source());

	const watcher = adapter.createWatcher(() => {
		// Do NOT call watcher.watch() here — in TC39 that throws during the
		// notification phase. Schedule the update and re-arm there instead.
		scheduler.schedule(() => {
			const current = adapter.untrack(() => source());
			if (!Object.is(current, lastSeen)) {
				// Set prev to the OLD value before updating lastSeen.
				adapter.untrack(() => prev.set(lastSeen));
				lastSeen = current;
			}
			// Re-arm for the next change (safe here — outside notification phase).
			// Unwatch before re-watching to prevent duplicate entries in TC39's
			// liveConsumerNode array (which would grow unboundedly, causing a leak).
			try {
				watcher.unwatch(source);
				watcher.watch(source);
			} catch {
				/* already disposed */
			}
		});
	});

	watcher.watch(source);

	// The returned computed simply reads `prev` — it is reactive so any
	// component/effect that reads it will re-run when prev changes.
	const output = Object.assign(
		adapter.createComputed<T | undefined>(() => prev()),
		{
			dispose(): void {
				try {
					watcher.unwatch(source);
				} catch {
					/* ok */
				}
				watcher.dispose();
			},
		},
	) as unknown as DisposableSignal<T | undefined>;

	// Auto-register with the active owner scope so this computedPrevious is
	// automatically disposed when the component disconnects from the DOM.
	getActiveOwner()?.push(output.dispose.bind(output));

	return output;
}
