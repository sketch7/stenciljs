import { describe, expect, it, vi } from "vitest";

import { proxySignal } from "../src/extensions/proxy-signal";
import { computed, signal } from "../src/tc39";

describe("proxySignal — read projection (get only)", () => {
	it("projects the source value on read", () => {
		const source = signal(2);
		const doubled = proxySignal(source, { get: s => s() * 2 });

		expect(doubled()).toBe(4);
		expect(doubled.peek()).toBe(4);
	});

	it("is reactive — projected reads track the source", () => {
		const source = signal(1);
		const tenfold = proxySignal(source, { get: s => s() * 10 });
		const plusOne = computed(() => tenfold() + 1);

		expect(plusOne()).toBe(11);
		source.set(2);
		expect(plusOne()).toBe(21);
	});

	it("is read-only — no set/update", () => {
		const source = signal(0);
		const view = proxySignal(source, { get: s => s() });

		expect((view as { set?: unknown }).set).toBeUndefined();
	});
});

describe("proxySignal — write interception (get + set)", () => {
	it("projects reads and intercepts writes", () => {
		const celsius = signal(0);
		const fahrenheit = proxySignal(celsius, {
			get: s => s() * (9 / 5) + 32,
			set: (s, f) => s.set((f - 32) * (5 / 9)),
		});

		expect(fahrenheit()).toBe(32);

		fahrenheit.set(212);
		expect(celsius()).toBe(100);
		expect(fahrenheit()).toBe(212);
	});

	it("update() derives from the projected current value", () => {
		const celsius = signal(100);
		const fahrenheit = proxySignal(celsius, {
			get: s => s() * (9 / 5) + 32,
			set: (s, f) => s.set((f - 32) * (5 / 9)),
		});

		fahrenheit.update(f => f - 212); // 212 - 212 = 0°F → -17.78°C
		expect(fahrenheit()).toBe(0);
		expect(Math.round(celsius())).toBe(-18);
	});

	it("asReadonly() returns a memoized, read-only projection", () => {
		const source = signal(3);
		const proxied = proxySignal(source, { get: s => s() + 1, set: (s, v) => s.set(v - 1) });

		const readonly = proxied.asReadonly();
		expect(readonly()).toBe(4);
		expect(proxied.asReadonly()).toBe(readonly); // memoized
		expect((readonly as { set?: unknown }).set).toBeUndefined();

		source.set(10);
		expect(readonly()).toBe(11);
	});
});

describe("proxySignal — write interception (set only)", () => {
	it("passes reads through and routes writes via the handler", () => {
		const source = signal(1);
		const logged: number[] = [];
		const proxied = proxySignal(source, {
			set: (s, v) => {
				logged.push(v);
				s.set(v);
			},
		});

		expect(proxied()).toBe(1);
		proxied.set(2);
		expect(proxied()).toBe(2);
		expect(logged).toStrictEqual([2]);
	});

	it("skips no-op writes using equality", () => {
		const source = signal(1);
		const setHook = vi.fn((s: { set: (v: number) => void }, v: number) => s.set(v));
		const proxied = proxySignal(source, { set: setHook });

		proxied.set(1); // equal to current → skipped
		expect(setHook).not.toHaveBeenCalled();

		proxied.set(2);
		expect(setHook).toHaveBeenCalledOnce();
	});
});
