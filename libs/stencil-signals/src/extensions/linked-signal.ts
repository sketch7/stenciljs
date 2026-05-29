import { getAdapter } from "../adapters/active";
import type { Signal, WritableSignal } from "../adapters/types";

/** Prior state passed to a {@link LinkedComputation} — the source value and the value it produced. */
export type LinkedPrevious<S, D> = {
	/** The source value at the time the previous value was computed. */
	source: S;
	/** The previous derived value. */
	value: D;
};

/**
 * Derives the value of a {@link linkedSignal} from its source.
 *
 * @param source   The current source value (tracked).
 * @param previous The prior `{ source, value }`, or `undefined` on the first run.
 */
export type LinkedComputation<S, D> = (source: S, previous: LinkedPrevious<S, D> | undefined) => D;

/** Options for the simple `linkedSignal(() => derived, options?)` form. */
export type LinkedSignalOptions<D> = {
	/** Custom equality used by the underlying computed. When it returns `true` the value is unchanged. */
	equal?: (a: D, b: D) => boolean;
};

/** Config for the explicit `linkedSignal({ source, computation, equal? })` form. */
export type LinkedSignalConfig<S, D> = {
	/** Reactive source — read inside a tracked context. A change resets the linked signal. */
	source: () => S;
	/** Computes the derived value from the (changed) source and the previous state. */
	computation: LinkedComputation<S, D>;
	/** Custom equality used by the underlying computed. */
	equal?: (a: D, b: D) => boolean;
};

/**
 * Creates a **writable** signal whose value is derived from a source, but which
 * **resets** to the derived value whenever that source changes. Between source
 * changes the value can be locally overridden with `set()` / `update()`, and a
 * local write wins over a pending source change until the next genuine change.
 *
 * Two forms:
 *
 * ```ts
 * // Simple: source IS the derived value.
 * const choice = linkedSignal(() => options()[0]);
 *
 * // Explicit: derive from a source, with access to the previous state.
 * const choice = linkedSignal({
 *   source: () => options(),
 *   computation: (opts, prev) =>
 *     opts.includes(prev?.value as string) ? (prev!.value as string) : opts[0],
 * });
 * ```
 *
 * Evaluation is lazy and synchronous, mirroring `computed`.
 *
 * **Limitation:** a source change is detected with `Object.is`. A `source` that returns a
 * fresh object/array literal on every read (with no identity change when "nothing changed")
 * will reset on every evaluation and discard local writes. Prefer sources that return
 * primitives or stable references — e.g. `() => selected()` rather than `() => ({ selected })`.
 *
 * Note: a custom `equal` is honored on the TC39 backend; the Preact backend ignores custom
 * `equals` on computeds (an existing documented adapter limitation).
 */
export function linkedSignal<D>(computation: () => D, options?: LinkedSignalOptions<D>): WritableSignal<D>;
export function linkedSignal<S, D>(config: LinkedSignalConfig<S, D>): WritableSignal<D>;
export function linkedSignal<S, D>(
	computationOrConfig: (() => D) | LinkedSignalConfig<S, D>,
	options?: LinkedSignalOptions<D>,
): WritableSignal<D> {
	const adapter = getAdapter();

	let source: () => S;
	let computation: LinkedComputation<S, D>;
	let equal: ((a: D, b: D) => boolean) | undefined;

	if (typeof computationOrConfig === "function") {
		// Simple form: the source IS the derived value, so computation is identity.
		source = computationOrConfig as unknown as () => S;
		computation = current => current as unknown as D;
		equal = options?.equal;
	} else {
		source = computationOrConfig.source;
		computation = computationOrConfig.computation;
		equal = computationOrConfig.equal;
	}

	let lastSource: S;
	let lastValue: D;
	let have = false;

	// Bumped on each local write to invalidate the computed below.
	const writeVersion = adapter.createState(0);

	const out: Signal<D> = adapter.createComputed<D>(
		() => {
			const current = source();
			writeVersion();

			if (!have || !Object.is(current, lastSource)) {
				const previous = have ? { source: lastSource, value: lastValue } : undefined;
				lastValue = computation(current, previous);
				lastSource = current;
				have = true;
			}

			return lastValue;
		},
		equal ? { equals: equal } : undefined,
	);

	const set = (value: D): void => {
		// Consume the (possibly pending) source change so this write wins over it.
		lastSource = adapter.untrack(() => source());
		lastValue = value;
		have = true;
		writeVersion.update(v => v + 1);
	};

	const update = (fn: (current: D) => D): void => {
		// Apply any pending reset first, then derive the next value from it.
		const current = adapter.untrack(() => out());
		set(fn(current));
	};

	return Object.assign(() => out(), {
		get: () => out.get(),
		peek: () => out.peek(),
		set,
		update,
		asReadonly: () => out,
	}) as WritableSignal<D>;
}
