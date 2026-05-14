/**
 * @ssv/stencil-signals — utils/signal-prop.ts
 *
 * Utilities for binding Stencil @Prop() fields to signals so they participate
 * in the signal graph without manual `@Watch` bookkeeping.
 *
 * Three public functions:
 *
 * ─── Bulk (many props at once) ────────────────────────────────────────────────
 *
 *   withSignalProps(host, HostClass)
 *
 * Returns a typed builder function. Call the builder with a config map to
 * create one signal per entry. Non-twoWay keys → Signal<T>. twoWay keys → WritableSignal<T>.
 */

import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";
import { getElement } from "@stencil/core";

import type { Signal, WritableSignal } from "../adapters/types";
import { signal as createSignal } from "../signals/core";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SignalPropOptions<T = unknown> = {
	/** Fallback when the prop value is `null` or `undefined`. */
	default?: T;
	/** Log a console error during `hostWillLoad` when the prop is null or undefined. */
	required?: boolean;
	/** Emit a `${propName}Change` CustomEvent on every signal write (two-way binding). */
	twoWay?: boolean;
	/** Transform the raw attribute / prop value before storing in the signal. */
	transform?: (rawValue: T) => T;
};

/**
 * Infers the signal value type from an options entry.
 *
 * Resolution order (first match wins):
 *  1. `transform` return type — explicit sanitiser always wins
 *  2. `H[K]`      — prop type from the host class (requires `as HostClass` cast at call site)
 *  3. `unknown`   — fallback when neither is available
 */
type PropValue<H, K extends string, Opts extends SignalPropOptions<unknown>> = Opts extends {
	transform: (v: unknown) => infer R;
}
	? R
	: (H & Record<K, unknown>)[K];

type PropSignal<H, K extends string, Opts extends SignalPropOptions<unknown>> = Opts extends { twoWay: boolean }
	? WritableSignal<PropValue<H, K, Opts>>
	: Signal<PropValue<H, K, Opts>>;

export type SignalPropsResult<H, C extends Record<string, SignalPropOptions<unknown>>> = {
	[K in keyof C & string]: PropSignal<H, K, NonNullable<C[K]>>;
};

// ─── Internal types ───────────────────────────────────────────────────────────

type AnyHost = ReactiveControllerHost & Record<string, unknown>;

type PropEntry = {
	propName: string;
	inner: WritableSignal<unknown>;
	exposed: WritableSignal<unknown> | Signal<unknown>;
	isSyncing: { value: boolean };
	options: SignalPropOptions<unknown>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyTransform<T>(raw: unknown, options: SignalPropOptions<T>): T {
	const value = raw ?? options.default;
	return options.transform ? options.transform(value as T) : (value as T);
}

function dispatchChange(host: AnyHost, propName: string, value: unknown): void {
	if (typeof CustomEvent === "undefined") {
		return;
	}
	try {
		const el = getElement(host);
		el?.dispatchEvent(new CustomEvent(`${propName}Change`, { detail: value, bubbles: true, composed: true }));
	} catch {
		// SSR or getElement unavailable — swallow silently
	}
}

function makeTwoWaySignal<T>(
	inner: WritableSignal<T>,
	isSyncing: { value: boolean },
	host: AnyHost,
	propName: string,
): WritableSignal<T> {
	const wrapper = function twoWaySignal() {
		return inner();
	} as unknown as WritableSignal<T>;

	Object.defineProperties(wrapper, {
		get: { value: () => inner.get() },
		peek: { value: () => inner.peek() },
		asReadonly: { value: () => inner.asReadonly() },
		set: {
			value: (v: T) => {
				inner.set(v);
				if (!isSyncing.value) {
					dispatchChange(host, propName, v);
				}
			},
		},
		update: {
			value: (fn: (current: T) => T) => {
				const next = fn(inner.peek());
				inner.set(next);
				if (!isSyncing.value) {
					dispatchChange(host, propName, next);
				}
			},
		},
	});

	return wrapper;
}

function buildEntry(host: AnyHost, propName: string, options: SignalPropOptions<unknown>): PropEntry {
	const initial = applyTransform(host[propName], options);
	const inner = createSignal(initial);
	const isSyncing = { value: false };
	const exposed = options.twoWay ? makeTwoWaySignal(inner, isSyncing, host, propName) : inner.asReadonly();
	return { propName, inner, exposed, isSyncing, options };
}

function syncEntry(host: AnyHost, entry: PropEntry): void {
	const value = applyTransform(host[entry.propName], entry.options);
	if (!Object.is(value, entry.inner.peek())) {
		entry.isSyncing.value = true;
		entry.inner.set(value);
		entry.isSyncing.value = false;
	}
}

function checkRequired(host: AnyHost, entry: PropEntry): void {
	const val = entry.inner.peek();
	if (entry.options.required && (val === null || val === undefined)) {
		const meta = (host as unknown as { constructor: { cmpMeta?: { $tagName$?: string } } }).constructor?.cmpMeta;
		const tag = meta?.$tagName$ ?? "unknown";
		console.error(`[signal-prop] Required prop "${entry.propName}" is null or undefined on <${tag}>.`);
	}
}

// ─── Bulk ReactiveController ──────────────────────────────────────────────────

class SignalBulkController implements ReactiveController {
	constructor(
		private readonly host: AnyHost,
		private readonly entries: PropEntry[],
	) {
		host.addController(this);
	}

	hostWillLoad(): void {
		for (const entry of this.entries) {
			syncEntry(this.host, entry);
			checkRequired(this.host, entry);
		}
	}

	hostWillUpdate(): void {
		for (const entry of this.entries) {
			syncEntry(this.host, entry);
		}
	}
}

function registerBulkController(host: ReactiveControllerHost, entries: PropEntry[]): SignalBulkController {
	return new SignalBulkController(host as AnyHost, entries);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Bulk prop bindings — preferred when bridging multiple @Prop fields.
 *
 * Pass the class constructor so TypeScript resolves `H` concretely before
 * evaluating the config. This lets `transform`'s `v` parameter be
 * automatically typed from the `@Prop` type — no annotations needed:
 * ```ts
 * readonly $props = withSignalProps(this, AppTimer)({
 *   duration:  { transform: v => Math.max(0, v) }, // v: number
 *   isRunning: { twoWay: true },                   // WritableSignal<boolean>
 * });
 * ```
 */
export function withSignalProps<H extends ReactiveControllerHost>(
	host: ReactiveControllerHost,
	hostClass: abstract new (...args: unknown[]) => H,
): <const C extends { [K in keyof H & string]?: SignalPropOptions<H[K]> }>(
	config: C & Record<Exclude<keyof C & string, keyof H & string>, never>,
) => SignalPropsResult<H, C>;

export function withSignalProps(
	host: ReactiveControllerHost,
	_hostClass: abstract new (...args: unknown[]) => unknown,
): unknown {
	return <C extends Record<string, SignalPropOptions<unknown>>>(config: C) => {
		const entries = Object.entries(config).map(([key, opts]) => buildEntry(host as AnyHost, key, opts ?? {}));
		registerBulkController(host, entries);
		return Object.fromEntries(entries.map(e => [e.propName, e.exposed]));
	};
}
