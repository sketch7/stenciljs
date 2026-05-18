import { TestHost } from "@ssv/stencil.core/testing";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";
import * as stencilCore from "@stencil/core";
import { describe, it, expect, expectTypeOf, vi, afterEach, beforeEach } from "vitest";

import { useSignalWatcher } from "../src/controllers/signal-watcher-controller";
import { resolvePassiveOption, toAddEventListenerOptions } from "../src/extensions/passive-heuristics";
import { signalFromEvent } from "../src/extensions/signal-from-event";

type ListenerRecord = {
	fn: EventListenerOrEventListenerObject;
	opts: boolean | AddEventListenerOptions;
};

function listenerFn(rec: ListenerRecord): EventListener {
	return typeof rec.fn === "function" ? rec.fn : rec.fn.handleEvent.bind(rec.fn);
}

function optsKey(opts: boolean | AddEventListenerOptions | undefined): string {
	return JSON.stringify(opts ?? false);
}

class EventTargetHost extends TestHost {
	private readonly listeners = new Map<string, Map<string, ListenerRecord>>();

	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void {
		const key = optsKey(options);
		let byOpts = this.listeners.get(type);
		if (!byOpts) {
			byOpts = new Map();
			this.listeners.set(type, byOpts);
		}
		byOpts.set(key, { fn: listener, opts: options ?? false });
	}

	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void {
		const byOpts = this.listeners.get(type);
		if (!byOpts) {
			return;
		}
		const key = optsKey(options);
		const rec = byOpts.get(key);
		if (rec && rec.fn === listener) {
			byOpts.delete(key);
		}
	}

	dispatchEvent(event: Event): boolean {
		const byOpts = this.listeners.get(event.type);
		byOpts?.forEach(rec => {
			listenerFn(rec).call(this, event);
		});
		return true;
	}

	getListener(type: string, options?: boolean | AddEventListenerOptions): ListenerRecord | undefined {
		return this.listeners.get(type)?.get(optsKey(options));
	}
}

describe("signalFromEvent", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.spyOn(stencilCore, "getElement").mockImplementation(host => host as unknown as HTMLStencilElement);
	});

	it("throws without useSignalWatcher on connect", () => {
		const host = new EventTargetHost();
		signalFromEvent("todoCompleted");
		expect(() => host.connect()).toThrow(/signalFromEvent requires useSignalWatcher\(\) declared before this field/);
	});

	it("no map: dispatchEvent on host stores the same CustomEvent reference", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		const $event = signalFromEvent<CustomEvent<{ id: number }>>("todoCompleted");

		host.connect();
		const ev = new CustomEvent("todoCompleted", { detail: { id: 1 } });
		host.dispatchEvent(ev);

		expect($event()).toBe(ev);
	});

	it("with initialValue: signal type excludes undefined", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		const $pos = signalFromEvent<MouseEvent, { x: number; y: number }>("mousemove", {
			map: ({ clientX, clientY }) => ({ x: clientX, y: clientY }),
			initialValue: { x: 0, y: 0 },
		});

		expectTypeOf($pos).returns.toEqualTypeOf<{ x: number; y: number }>();

		host.connect();
		expect($pos()).toEqual({ x: 0, y: 0 });
	});

	it("with map: signal holds detail", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		const $detail = signalFromEvent<CustomEvent<{ id: number }>, { id: number }>("todoCompleted", {
			map: e => e.detail,
		});

		host.connect();
		host.dispatchEvent(new CustomEvent("todoCompleted", { detail: { id: 42 } }));

		expect($detail()).toEqual({ id: 42 });
	});

	it("target window", () => {
		const host = new EventTargetHost();
		useSignalWatcher();

		const add = vi.fn();
		const remove = vi.fn();
		const win = {
			addEventListener: add,
			removeEventListener: remove,
		};
		vi.stubGlobal("window", win);

		const $scroll = signalFromEvent("scroll", { target: "window" });
		const scrollOpts = toAddEventListenerOptions(false, resolvePassiveOption("scroll", undefined));
		host.connect();

		expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), scrollOpts);

		const handler = add.mock.calls[0]![1] as EventListener;
		handler(new Event("scroll"));
		expect($scroll()).toBeInstanceOf(Event);

		host.disconnect();
		expect(remove).toHaveBeenCalledWith("scroll", handler, scrollOpts);
	});

	it("capture: true passed to addEventListener", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		signalFromEvent("click", { capture: true });
		const clickOpts = toAddEventListenerOptions(true, resolvePassiveOption("click", undefined));

		host.connect();
		expect(host.getListener("click", clickOpts)).toBeDefined();
	});

	it("passive heuristic for a known event name", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		signalFromEvent("scroll");
		const scrollOpts = toAddEventListenerOptions(false, resolvePassiveOption("scroll", undefined));

		host.connect();
		expect(host.getListener("scroll", scrollOpts)).toBeDefined();
	});

	it("disconnect/reconnect re-attaches and works", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		const $event = signalFromEvent<CustomEvent<string>>("msg");

		host.connect();
		host.dispatchEvent(new CustomEvent("msg", { detail: "first" }));
		expect($event()?.detail).toBe("first");

		host.disconnect();
		host.dispatchEvent(new CustomEvent("msg", { detail: "while disconnected" }));
		expect($event()?.detail).toBe("first");

		host.connect();
		host.dispatchEvent(new CustomEvent("msg", { detail: "second" }));
		expect($event()?.detail).toBe("second");
	});

	it("peek snapshot after disconnect", () => {
		const host = new EventTargetHost();
		useSignalWatcher();
		const $event = signalFromEvent<CustomEvent<number>>("value");

		host.connect();
		host.dispatchEvent(new CustomEvent("value", { detail: 7 }));

		host.disconnect();
		expect($event.peek()?.detail).toBe(7);
	});
});
