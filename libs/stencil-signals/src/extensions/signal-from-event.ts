import { getCurrentHost, peekCurrentHost, use } from "@ssv/stencil-core";
import type { ReactiveControllerHost } from "@ssv/stencil-core";
import { getElement } from "@stencil/core";
import type { ListenOptions } from "@stencil/core";

import type { Signal } from "../adapters/types";
import { getActiveOwner, signal as createSignal } from "../signals/core";
import type { DisposableSignal } from "./derived-async";
import { bindToHostDisposable } from "./host-bind";
import { resolvePassiveOption, toAddEventListenerOptions } from "./passive-heuristics";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SignalFromEventOptions<TEvent extends Event = Event, TStored = TEvent> = ListenOptions & {
	/** Project event → stored value. Omit to store the event itself (default). */
	map?: (ev: TEvent) => TStored;
	/** When set, the signal is always defined (`Signal<TStored>`). When omitted, `Signal<TStored | undefined>`. */
	initialValue?: TStored;
};

// ─── Internal types ───────────────────────────────────────────────────────────

type ListenInner<T> = Signal<T> & {
	dispose(): void;
};

type AttachConfig<TEvent extends Event> = {
	eventName: string;
	options: SignalFromEventOptions<TEvent>;
	initialValue: unknown;
};

// ─── Target / listener helpers ────────────────────────────────────────────────

function resolveEventTarget(target: ListenOptions["target"], host: ReactiveControllerHost): EventTarget {
	const g = globalThis as Window & typeof globalThis;
	switch (target) {
		case "window": {
			return g.window;
		}
		case "document": {
			return g.document;
		}
		case "body": {
			return g.document.body;
		}
		default: {
			return getElement(host) as EventTarget;
		}
	}
}

function attachSignalFromEvent<TEvent extends Event, TStored>(
	config: AttachConfig<TEvent>,
): ListenInner<TStored | undefined> {
	const { eventName, options } = config;
	const capture = options.capture ?? false;
	const passive = resolvePassiveOption(eventName, options.passive);
	const listenerOpts = toAddEventListenerOptions(capture, passive);

	const host = getCurrentHost();
	const target = resolveEventTarget(options.target, host);

	const inner = createSignal<TStored | undefined>(config.initialValue as TStored | undefined);

	const handler = (ev: Event): void => {
		const next = options.map ? (options.map(ev as TEvent) as unknown as TStored) : (ev as unknown as TStored);
		inner.set(next);
	};

	target.addEventListener(eventName, handler, listenerOpts);

	const detach = (): void => {
		target.removeEventListener(eventName, handler, listenerOpts);
	};

	use({
		hostDisconnected(): void {
			detach();
		},
	});

	const readonly = inner.asReadonly();

	const listen = Object.assign(readonly, {
		dispose: detach,
	});

	getActiveOwner()?.push(() => listen.dispose());

	return listen;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** DOM event listener as a signal; declare `useSignalWatcher()` first on components. */
export function signalFromEvent<TEvent extends Event = Event>(
	eventName: string,
	options?: ListenOptions,
): Signal<TEvent | undefined>;

export function signalFromEvent<TEvent extends Event = Event>(
	eventName: string,
	options: ListenOptions & { initialValue: TEvent; map?: undefined },
): Signal<TEvent>;

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- TEvent lets callers constrain the map callback (e.g. signalFromEvent<MouseEvent, ...>)
export function signalFromEvent<TEvent extends Event, T>(
	eventName: string,
	options: ListenOptions & { map: (ev: TEvent) => T },
): Signal<T | undefined>;

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- TEvent lets callers constrain the map callback (e.g. signalFromEvent<MouseEvent, ...>)
export function signalFromEvent<TEvent extends Event, T>(
	eventName: string,
	options: ListenOptions & { map: (ev: TEvent) => T; initialValue: T },
): Signal<T>;

export function signalFromEvent<TEvent extends Event = Event>(
	eventName: string,
	options?: SignalFromEventOptions<TEvent>,
): Signal<unknown> {
	const opts = options ?? {};
	const initialValue = opts.initialValue;

	if (peekCurrentHost() !== null) {
		return bindToHostDisposable({
			utilityName: "signalFromEvent",
			initialSnapshot: initialValue,
			create: snapshot =>
				attachSignalFromEvent<TEvent, unknown>({
					eventName,
					options: opts,
					initialValue: snapshot,
				}),
			read: inner => inner() as TEvent | undefined,
			peek: inner => inner.peek() as TEvent | undefined,
			disposeInner: inner => inner.dispose(),
		}) as DisposableSignal<unknown>;
	}

	return attachSignalFromEvent<TEvent, unknown>({
		eventName,
		options: opts,
		initialValue,
	});
}
