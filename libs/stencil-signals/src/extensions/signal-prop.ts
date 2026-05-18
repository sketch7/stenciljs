import { createWritableRef, getCurrentHost } from "@ssv/stencil.core";
import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";
import { getElement } from "@stencil/core";

import type { Signal, WritableSignal } from "../adapters/types";
import { getActiveOwner, signal as createSignal } from "../signals/core";
import { bindToHostProps } from "./host-bind";
import type { HostPropsSnapshotBag } from "./host-bind";

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
	isSyncing: { value: boolean };
	options: SignalPropOptions<unknown>;
	/** Last value received from the external @Prop — used by twoWay to detect genuine external changes. */
	lastExternalPropValue: unknown;
};

type PropsBundle = {
	entries: PropEntry[];
	controller: SignalBulkController;
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

function getEntry(bundle: PropsBundle | null, propName: string): PropEntry | undefined {
	return bundle?.entries.find(e => e.propName === propName);
}

function makeStableReadonlyFacade<T>(
	propName: string,
	getBundle: () => PropsBundle | null,
	snapshotBag: HostPropsSnapshotBag,
): Signal<T> {
	return Object.assign(
		(): T => {
			const entry = getEntry(getBundle(), propName);
			return entry ? (entry.inner() as T) : (snapshotBag.values[propName] as T);
		},
		{
			get(): T {
				return (this as Signal<T>)();
			},
			peek(): T {
				const entry = getEntry(getBundle(), propName);
				return entry ? (entry.inner.peek() as T) : (snapshotBag.values[propName] as T);
			},
		},
	);
}

function makeStableTwoWayFacade<T>(
	propName: string,
	host: AnyHost,
	getBundle: () => PropsBundle | null,
	snapshotBag: HostPropsSnapshotBag,
): WritableSignal<T> {
	const wrapper = function twoWayPropFacade(): T {
		const entry = getEntry(getBundle(), propName);
		return entry ? (entry.inner() as T) : (snapshotBag.values[propName] as T);
	} as unknown as WritableSignal<T>;

	Object.defineProperties(wrapper, {
		get: {
			value: (): T => wrapper(),
		},
		peek: {
			value: (): T => {
				const entry = getEntry(getBundle(), propName);
				return entry ? (entry.inner.peek() as T) : (snapshotBag.values[propName] as T);
			},
		},
		asReadonly: {
			value: (): Signal<T> => makeStableReadonlyFacade<T>(propName, getBundle, snapshotBag),
		},
		set: {
			value: (v: T) => {
				const bundle = getBundle();
				const entry = getEntry(bundle, propName);
				if (entry === undefined) {
					snapshotBag.values[propName] = v;
					return;
				}
				entry.inner.set(v);
				if (!entry.isSyncing.value && bundle?.controller.isActive()) {
					dispatchChange(host, propName, v);
				}
			},
		},
		update: {
			value: (fn: (current: T) => T) => {
				const bundle = getBundle();
				const entry = getEntry(bundle, propName);
				if (entry === undefined) {
					const next = fn(snapshotBag.values[propName] as T);
					snapshotBag.values[propName] = next;
					return;
				}
				const next = fn(entry.inner.peek() as T);
				entry.inner.set(next);
				if (!entry.isSyncing.value && bundle?.controller.isActive()) {
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
	return { propName, inner, isSyncing, options, lastExternalPropValue: initial };
}

function syncEntry(host: AnyHost, entry: PropEntry): void {
	const value = applyTransform(host[entry.propName], entry.options);

	if (entry.options.twoWay) {
		// For twoWay props, only sync when the external prop actually changes.
		// This preserves internal set() calls until the parent explicitly responds.
		const propChanged = !Object.is(value, entry.lastExternalPropValue);
		if (!propChanged) {
			return;
		}
		entry.lastExternalPropValue = value;
	}

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
	private active = true;

	constructor(
		private readonly host: AnyHost,
		private readonly entries: PropEntry[],
	) {
		host.addController(this);
	}

	isActive(): boolean {
		return this.active;
	}

	deactivate(): void {
		this.active = false;
	}

	hostWillLoad(): void {
		if (!this.active) {
			return;
		}
		for (const entry of this.entries) {
			syncEntry(this.host, entry);
			checkRequired(this.host, entry);
		}
	}

	hostWillUpdate(): void {
		if (!this.active) {
			return;
		}
		for (const entry of this.entries) {
			syncEntry(this.host, entry);
		}
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Bridge `@Prop()` fields to signals; declare `useSignalWatcher()` first. */
export function useSignalProps<H extends ReactiveControllerHost>(
	hostClass: abstract new (...args: unknown[]) => H,
): <const C extends { [K in keyof H & string]?: SignalPropOptions<H[K]> }>(
	config: C & Record<Exclude<keyof C & string, keyof H & string>, never>,
) => SignalPropsResult<H, C>;

export function useSignalProps(_hostClass: abstract new (...args: unknown[]) => unknown): unknown {
	const host = getCurrentHost() as AnyHost;
	const bundleRef = createWritableRef<PropsBundle | null>(null);
	const getBundle = (): PropsBundle | null => bundleRef.current;

	return <C extends Record<string, SignalPropOptions<unknown>>>(config: C) => {
		const snapshotBag: HostPropsSnapshotBag = { values: {} };
		const stableProps = {} as Record<string, Signal<unknown> | WritableSignal<unknown>>;

		for (const [propName, opts] of Object.entries(config)) {
			const options = opts ?? {};
			snapshotBag.values[propName] = applyTransform(host[propName], options);
			stableProps[propName] = options.twoWay
				? makeStableTwoWayFacade(propName, host, getBundle, snapshotBag)
				: makeStableReadonlyFacade(propName, getBundle, snapshotBag);
		}

		return bindToHostProps({
			utilityName: "useSignalProps",
			snapshotBag,
			props: stableProps,
			snapshotFromProps: props =>
				Object.fromEntries(Object.keys(config).map(key => [key, (props[key] as Signal<unknown>).peek()])),
			create: () => {
				const entries = Object.entries(config).map(([key, opts]) => buildEntry(host, key, opts ?? {}));
				const controller = new SignalBulkController(host, entries);
				bundleRef.current = { entries, controller };

				const dispose = (): void => {
					controller.deactivate();
					host.removeController(controller);
					bundleRef.current = null;
				};
				getActiveOwner()?.push(dispose);
				return dispose;
			},
		}) as SignalPropsResult<ReactiveControllerHost, C>;
	};
}
