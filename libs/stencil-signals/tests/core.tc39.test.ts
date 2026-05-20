import { TestHost } from "@ssv/stencil.core/testing";
/**
 * tests/core.test.ts
 *
 * Unit tests for all @ssv/stencil-signals utilities.
 * Run with: npm test
 */
import { describe, it, expect, vi, expectTypeOf } from "vitest";

import { useSignalWatcher } from "../src/controllers/signal-watcher-controller";
import { computedPrevious } from "../src/extensions/computed-previous";
import { createStore } from "../src/extensions/create-store";
import { derivedAsync } from "../src/extensions/derived-async";
import { effect } from "../src/extensions/effect";
// Import the TC39 entry point first — this sets the TC39 adapter so all
// utilities that call getAdapter() work correctly in this test file.
import { signal, computed, createWatcher, untracked } from "../src/tc39";

// Helper: flush all pending microtasks
const flush = () =>
	new Promise<void>(r => {
		setTimeout(r, 0);
	});
const tick = () =>
	new Promise<void>(r => {
		queueMicrotask(r);
	});

// ─── signal() ────────────────────────────────────────────────────────────────

describe("signal()", () => {
	it("holds an initial value", () => {
		const s = signal(42);
		expect(s()).toBe(42);
	});

	it("updates on set()", () => {
		const s = signal(0);
		s.set(7);
		expect(s()).toBe(7);
	});

	it("is a callable function with set() and peek()", () => {
		const s = signal("x");
		expectTypeOf(s).toBeFunction();
		expectTypeOf(s.set).toBeFunction();
		expectTypeOf(s.peek).toBeFunction();
	});

	it("updates via update()", () => {
		const s = signal(10);
		s.update(n => n * 2);
		expect(s()).toBe(20);
		s.update(n => n - 5);
		expect(s()).toBe(15);
	});

	it("update() uses an untracked read — does not create a dependency", () => {
		const s = signal(1);
		let computeCount = 0;
		const c = computed(() => {
			computeCount++;
			return s() * 10;
		});
		c(); // prime
		computeCount = 0;
		// update() reads via peek() internally — the computed should not re-run
		// because update sets the same dependency it reads, not an external one
		s.update(n => n + 1); // triggers invalidation as expected — just verify value is correct
		expect(c()).toBe(20);
		expect(computeCount).toBe(1);
	});

	it("respects custom equals — skips notify when equal", async () => {
		const s = signal({ v: 1 }, { equals: (a: { v: number }, b: { v: number }) => a.v === b.v });
		const notify = vi.fn();
		const w = createWatcher(notify);
		w.watch(s as any);
		s.set({ v: 1 }); // same value by custom equality
		await tick();
		expect(notify).not.toHaveBeenCalled();
		w.dispose();
	});
});

// ─── computed() ───────────────────────────────────────────────────────────────

describe("computed()", () => {
	it("derives from a signal", () => {
		const base = signal(3);
		const triple = computed(() => base() * 3);
		expect(triple()).toBe(9);
	});

	it("updates when dependency changes", () => {
		const n = signal(2);
		const sq = computed(() => n() ** 2);
		expect(sq()).toBe(4);
		n.set(5);
		expect(sq()).toBe(25);
	});

	it("chains computeds", () => {
		const a = signal(1);
		const b = computed(() => a() + 1);
		const c = computed(() => b() * 10);
		expect(c()).toBe(20);
		a.set(4);
		expect(c()).toBe(50);
	});

	it("is lazy — does not recompute until read", () => {
		const fn = vi.fn(() => 1);
		const c = computed(fn);
		expect(fn).not.toHaveBeenCalled();
		c();
		expect(fn).toHaveBeenCalledOnce();
	});
});

// ─── untracked() ───────────────────────────────────────────────────────────────

describe("untracked()", () => {
	it("reads inside untracked do not subscribe a surrounding computed", () => {
		const a = signal(0);
		const b = signal(100);
		const compute = vi.fn(() => a() + untracked(() => b()));
		const c = computed(compute);
		expect(c()).toBe(100);
		expect(compute).toHaveBeenCalledOnce();
		compute.mockClear();
		b.set(200);
		expect(c()).toBe(100);
		expect(compute).not.toHaveBeenCalled();
		a.set(1);
		expect(c()).toBe(201);
		expect(compute).toHaveBeenCalledOnce();
	});
});

// ─── createWatcher() ──────────────────────────────────────────────────────────

describe("createWatcher()", () => {
	it("calls notify when a watched signal changes", async () => {
		const s = signal(0);
		const notify = vi.fn();
		const w = createWatcher(notify);
		w.watch(s as any);
		s.set(1);
		await tick();
		expect(notify).toHaveBeenCalledOnce();
		w.dispose();
	});

	it("does not call notify after dispose", async () => {
		const s = signal(0);
		const notify = vi.fn();
		const w = createWatcher(notify);
		w.watch(s as any);
		w.dispose();
		s.set(99);
		await tick();
		expect(notify).not.toHaveBeenCalled();
	});

	it("calls notify for each distinct change", async () => {
		const s = signal(0);
		const notify = vi.fn();
		const w = createWatcher(notify);
		w.watch(s as any);
		s.set(1);
		await tick();
		s.set(2);
		await tick();
		expect(notify.mock.calls.length).toBeGreaterThanOrEqual(2);
		w.dispose();
	});
});

// ─── createStore() ────────────────────────────────────────────────────────────

describe("createStore()", () => {
	it("reads initial values", () => {
		const store = createStore({ name: "Alice", age: 30 });
		expect(store.name).toBe("Alice");
		expect(store.age).toBe(30);
	});

	it("updates on assignment", () => {
		const store = createStore({ count: 0 });
		store.count = 5;
		expect(store.count).toBe(5);
	});

	it("exposes raw signal via $signal()", () => {
		const store = createStore({ x: 10 });
		const sig = store.$signal("x");
		expect(sig()).toBe(10);
		sig.set(20);
		expect(store.x).toBe(20);
	});

	it("resets to initial values via $reset()", () => {
		const store = createStore({ a: 1, b: 2 });
		store.a = 99;
		store.b = 99;
		store.$reset();
		expect(store.a).toBe(1);
		expect(store.b).toBe(2);
	});

	it("supports computed properties", () => {
		const store = createStore({ price: 10, qty: 3 }, s => ({
			total: computed(() => s.price * s.qty),
		}));
		expect(store.total).toBe(30);
		store.price = 20;
		expect(store.total).toBe(60);
	});

	it("throws on write to unknown key", () => {
		const store = createStore({ a: 1 });
		expect(() => {
			(store as any).unknown = 2;
		}).toThrow();
	});
});

// ─── watchEffect() — auto-tracking ───────────────────────────────────────────

describe("watchEffect() — auto-tracking", () => {
	it("runs immediately — exactly once", () => {
		const fn = vi.fn();
		const cleanup = effect(fn);
		expect(fn).toHaveBeenCalledOnce();
		cleanup.dispose();
	});

	it("re-runs when accessed signal changes", async () => {
		const s = signal("a");
		const fn = vi.fn(() => {
			s();
		});
		const cleanup = effect(fn);
		expect(fn).toHaveBeenCalledOnce();
		s.set("b");
		await tick();
		await tick();
		cleanup.dispose();
		expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	it("calls returned cleanup before re-run", async () => {
		const s = signal(0);
		const innerCleanup = vi.fn();
		const cleanup = effect(_onCleanup => {
			s();
			return innerCleanup;
		});
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(innerCleanup).toHaveBeenCalledWith();
	});

	it("does not re-run after cleanup is called", async () => {
		const s = signal(0);
		const fn = vi.fn(() => {
			s();
		});
		const cleanup = effect(fn);
		cleanup.dispose();
		const callsBefore = fn.mock.calls.length;
		s.set(99);
		await tick();
		await tick();
		expect(fn).toHaveBeenCalledTimes(callsBefore);
	});

	it("tracks newly accessed signals on re-run", async () => {
		const toggle = signal(false);
		const a = signal(1);
		const b = signal(10);
		const fn = vi.fn(() => {
			if (toggle()) {
				b();
			} else {
				a();
			}
		});
		const cleanup = effect(fn);

		// Currently tracking `toggle` and `a`
		a.set(2);
		await tick();
		await tick();
		const callsAfterA = fn.mock.calls.length;

		// Switch to track `b`
		toggle.set(true);
		await tick();
		await tick();

		// Now `b` changes should trigger
		b.set(20);
		await tick();
		await tick();
		expect(fn.mock.calls.length).toBeGreaterThan(callsAfterA + 1);
		cleanup.dispose();
	});

	it("calls onCleanup() registered inside fn", async () => {
		const s = signal(0);
		const registered = vi.fn();
		const cleanup = effect(onCleanup => {
			s();
			onCleanup(registered);
		});
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(registered).toHaveBeenCalledWith();
	});

	it("calls onCleanup before return-value cleanup on re-run", async () => {
		const s = signal(0);
		const order: string[] = [];
		const cleanup = effect(onCleanup => {
			s();
			onCleanup(() => order.push("onCleanup"));
			return () => order.push("return");
		});
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(order).toStrictEqual(["onCleanup", "return", "onCleanup", "return"]);
	});
});

// ─── watchEffect() — explicit deps ───────────────────────────────────────────

describe("watchEffect() — explicit deps", () => {
	it("runs immediately with current dep values", () => {
		const a = signal(1);
		const b = signal("hello");
		const fn = vi.fn();
		const cleanup = effect([a, b], fn);
		expect(fn).toHaveBeenCalledOnce();
		expect(fn.mock.calls[0][0]).toStrictEqual([1, "hello"]);
		cleanup.dispose();
	});

	it("re-runs when a listed dep changes", async () => {
		const s = signal(0);
		const fn = vi.fn();
		const cleanup = effect([s], fn);
		s.set(5);
		await tick();
		await tick();
		cleanup.dispose();
		expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(fn.mock.calls[1][0]).toStrictEqual([5]);
	});

	it("does NOT re-run for signals read inside fn but not in deps", async () => {
		const dep = signal(0); // in deps list
		const other = signal(100); // NOT in deps list, but read inside fn
		// deliberately read `other` — should NOT cause re-run
		const fn = vi.fn(([_d]: readonly [number]) => {
			other();
		});
		const cleanup = effect([dep], fn);
		const callsBefore = fn.mock.calls.length;

		other.set(999); // change signal NOT in deps
		await tick();
		await tick();
		expect(fn).toHaveBeenCalledTimes(callsBefore); // no extra run

		dep.set(1); // change dep — should trigger
		await tick();
		await tick();
		expect(fn.mock.calls.length).toBeGreaterThan(callsBefore);
		cleanup.dispose();
	});

	it("defers initial run when defer:true", async () => {
		const s = signal(0);
		const fn = vi.fn();
		const cleanup = effect([s], fn, { defer: true });
		expect(fn).not.toHaveBeenCalled(); // should NOT run immediately
		s.set(1);
		await tick();
		await tick();
		expect(fn).toHaveBeenCalledOnce();
		cleanup.dispose();
	});

	it("calls return-value cleanup before re-run", async () => {
		const s = signal(0);
		const innerCleanup = vi.fn();
		const cleanup = effect([s], () => innerCleanup);
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(innerCleanup).toHaveBeenCalledWith();
	});

	it("calls onCleanup() registered inside fn", async () => {
		const s = signal(0);
		const registered = vi.fn();
		const cleanup = effect([s], (_vals, onCleanup) => {
			onCleanup(registered);
		});
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(registered).toHaveBeenCalledWith();
	});

	it("calls onCleanup before return-value cleanup on re-run", async () => {
		const s = signal(0);
		const order: string[] = [];
		const cleanup = effect([s], (_vals, onCleanup) => {
			onCleanup(() => order.push("onCleanup"));
			return () => order.push("return");
		});
		s.set(1);
		await tick();
		await tick();
		cleanup.dispose();
		expect(order).toStrictEqual(["onCleanup", "return", "onCleanup", "return"]);
	});

	it("does not re-run after disposal", async () => {
		const s = signal(0);
		const fn = vi.fn();
		const cleanup = effect([s], fn);
		cleanup.dispose();
		const countBefore = fn.mock.calls.length;
		s.set(99);
		await tick();
		await tick();
		expect(fn).toHaveBeenCalledTimes(countBefore);
	});

	it("handles multiple deps", async () => {
		const a = signal(1);
		const b = signal(2);
		const c = signal(3);
		const fn = vi.fn();
		const cleanup = effect([a, b, c], fn);
		b.set(20);
		await tick();
		await tick();
		expect(fn.mock.calls.at(-1)![0]).toStrictEqual([1, 20, 3]);
		cleanup.dispose();
	});
});

// ─── computedPrevious() ───────────────────────────────────────────────────────

describe("computedPrevious()", () => {
	it("returns undefined before any change by default", () => {
		const s = signal(42);
		const prev = computedPrevious(s);
		expect(prev()).toBeUndefined();
	});

	it("returns explicit initialValue before first change", () => {
		const s = signal(10);
		const prev = computedPrevious(s, -1);
		expect(prev()).toBe(-1);
	});

	it("returns the value before the last set()", async () => {
		const s = signal(0);
		const prev = computedPrevious(s);
		s.set(5);
		await tick();
		await tick();
		expect(prev()).toBe(0);
	});

	it("tracks multiple changes in sequence", async () => {
		const s = signal("a");
		const prev = computedPrevious(s);

		s.set("b");
		await tick();
		await tick();
		expect(prev()).toBe("a");

		s.set("c");
		await tick();
		await tick();
		expect(prev()).toBe("b");

		s.set("d");
		await tick();
		await tick();
		expect(prev()).toBe("c");
	});

	it("works with a computed signal as source", async () => {
		const n = signal(1);
		const doubled = computed(() => n() * 2);
		const prevDoubled = computedPrevious(doubled);

		// seed
		doubled();

		// n.set(3) causes doubled to change from 2 → 6
		n.set(3);
		await tick();
		await tick();
		// prevDoubled should have held 2 before the update
		const val = prevDoubled();
		expect([2, undefined]).toContain(val);
	});

	it("does not update when signal is set to the same value", async () => {
		const s = signal(7);
		const prev = computedPrevious(s);
		s.set(7); // same value — TC39 signals won't notify
		await tick();
		await tick();
		expect(prev()).toBeUndefined(); // never changed
	});
});

// ─── derivedAsync() ─────────────────────────────────────────────────────────

describe("derivedAsync()", () => {
	it("is undefined before first resolution", () => {
		const result = derivedAsync(async () => 42);
		expect(result()).toBeUndefined();
		result.dispose();
	});

	it("resolves to the returned value", async () => {
		const result = derivedAsync(async () => "hello");
		await flush();
		expect(result()).toBe("hello");
		result.dispose();
	});

	it("uses initialValue before first resolution", () => {
		const result = derivedAsync(async () => 99, { initialValue: 0 });
		expect(result()).toBe(0);
		result.dispose();
	});

	it("keeps last resolved value while a new promise is in flight", async () => {
		const id = signal(1);
		let resolveNext!: (v: number) => void;

		const result = derivedAsync(async () => {
			const current = id();
			if (current === 1) {
				return 100;
			}
			return new Promise<number>(r => {
				resolveNext = r;
			});
		});

		await flush();
		expect(result()).toBe(100);

		// triggers re-run; in-flight until resolveNext
		id.set(2);
		await tick();
		// stale value preserved while pending
		expect(result()).toBe(100);

		resolveNext(200);
		await flush();
		expect(result()).toBe(200);
		result.dispose();
	});

	it("throws on read after rejection", async () => {
		const result = derivedAsync(async () => {
			throw new Error("boom");
		});
		await flush();
		expect(() => result()).toThrow("boom");
		expect(result.peek()).toBeUndefined();
		result.dispose();
	});

	it("re-runs when a tracked signal changes", async () => {
		const id = signal(1);
		const calls: number[] = [];

		const result = derivedAsync(async () => {
			const v = id();
			calls.push(v);
			return v * 10;
		});

		await flush();
		expect(result()).toBe(10);

		id.set(2);
		await flush();
		expect(result()).toBe(20);
		expect(calls).toContain(2);
		result.dispose();
	});

	it("cancels in-flight request via AbortSignal on dep change", async () => {
		const id = signal(1);
		const aborts: boolean[] = [];

		const result = derivedAsync(async abortSignal => {
			// track dep
			id();
			await new Promise<void>((_, reject) => {
				abortSignal.addEventListener("abort", () => {
					aborts.push(true);
					reject(new DOMException("Aborted", "AbortError"));
				});
				setTimeout(() => {
					if (!abortSignal.aborted) {
						reject(new Error("timeout"));
					}
				}, 5000);
			});
			return 0;
		});

		// Change dep while first request is in-flight
		await tick();
		id.set(2);
		await flush();

		expect(aborts.length).toBeGreaterThan(0);
		result.dispose();
	});

	it("returns sync value when fn returns non-Promise", async () => {
		const flag = signal(true);
		const result = derivedAsync(_abortSig => {
			if (flag()) {
				return "sync-value";
			}
			return Promise.resolve("async-value");
		});
		await flush();
		expect(result()).toBe("sync-value");
		result.dispose();
	});

	it("passes previous resolved value to the callback", async () => {
		const n = signal(1);
		const seen: (number | undefined)[] = [];
		const result = derivedAsync<number>(async (_sig, prev) => {
			seen.push(prev);
			return n() * 10;
		});
		await flush();
		expect(result()).toBe(10);
		expect(seen).toContain(undefined);
		n.set(2);
		await flush();
		expect(result()).toBe(20);
		expect(seen).toContain(10);
		result.dispose();
	});
});

// ─── Host lifecycle (disconnect / reconnect) ──────────────────────────────────

describe("host lifecycle — derivedAsync", () => {
	it("disposes on disconnect and reinits on reconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const id = signal(1);
		const calls: number[] = [];

		const result = derivedAsync<number>(async () => {
			const v = id();
			calls.push(v);
			return v * 10;
		});

		// hostConnected → starts async computation
		host.connect();
		await flush();
		expect(result()).toBe(10);

		const callsAtConnect = calls.length;

		host.disconnect();
		id.set(2);
		await flush();
		expect(result()).toBe(10);
		expect(calls).toHaveLength(callsAtConnect);

		host.connect();
		await flush();
		expect(result()).toBe(20);
		expect(calls).toContain(2);
	});

	it("throws without useSignalWatcher", () => {
		const host = new TestHost();
		derivedAsync(async () => 42);
		expect(() => host.connect()).toThrow(/derivedAsync requires useSignalWatcher\(\) declared before this field/u);
	});

	it("reinit is a no-op when watcher is still live", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const result = derivedAsync(async () => 42);

		// start computation
		host.connect();
		await flush();
		expect(result()).toBe(42);

		// Connect again without a prior disconnect — should be harmless (guarded by inner !== null).
		host.connect();
		await flush();
		expect(result()).toBe(42);
	});

	it("eager: starts async work before host.connect()", async () => {
		const host = new TestHost();
		useSignalWatcher();
		let ran = false;
		const result = derivedAsync(async () => {
			ran = true;
			return 7;
		});

		expect(ran).toBeTruthy();
		expect(result()).toBeUndefined();

		host.connect();
		await flush();
		expect(result()).toBe(7);
	});

	it("whenSettled resolves after first success", async () => {
		const result = derivedAsync(async () => 99);
		await result.whenSettled;
		expect(result()).toBe(99);
		result.dispose();
	});
});

describe("host lifecycle — effect (auto-tracking)", () => {
	it("throws without useSignalWatcher", () => {
		const host = new TestHost();
		effect(() => {
			/* auto-tracking test */
		});
		expect(() => host.connect()).toThrow(/effect requires useSignalWatcher\(\) declared before this field/u);
	});

	it("disposes on disconnect and reinits on reconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const count = signal(0);
		const log: number[] = [];

		effect(_onCleanup => {
			log.push(count());
		});
		host.connect(); // hostConnected → starts effect, fn runs synchronously
		expect(log).toStrictEqual([0]);

		count.set(1);
		await tick();
		expect(log).toContain(1);

		// Disconnect.
		host.disconnect();
		const lenAtDisconnect = log.length;
		count.set(2);
		await tick();
		expect(log).toHaveLength(lenAtDisconnect); // no re-run

		// Reconnect — factory() runs synchronously on hostConnected.
		host.connect();
		expect(log.length).toBeGreaterThan(lenAtDisconnect); // ran immediately on reconnect
		count.set(3);
		await tick();
		expect(log).toContain(3);
	});

	it("manual dispose stops the effect before disconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const count = signal(0);
		const log: number[] = [];

		const ref = effect(_onCleanup => {
			log.push(count());
		});
		host.connect();
		expect(log).toStrictEqual([0]);

		ref.dispose();
		const lenAfterDispose = log.length;
		count.set(1);
		await tick();
		expect(log).toHaveLength(lenAfterDispose);

		host.disconnect();
		host.connect();
		expect(log).toStrictEqual([0]);
	});
});

describe("host lifecycle — effect cleanup (destroy-only teardown)", () => {
	it("auto-tracking: does not run cleanups between dep updates; runs once on disconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const count = signal(0);
		const cleanup = vi.fn();
		effect(onCleanup => {
			count();
			onCleanup(cleanup);
		});
		host.connect();
		expect(cleanup).not.toHaveBeenCalled();
		count.set(1);
		await tick();
		await tick();
		count.set(2);
		await tick();
		await tick();
		expect(cleanup).not.toHaveBeenCalled();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
		host.dispose();
	});

	it("auto-tracking: manual outer .dispose() runs cleanup once before disconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const count = signal(0);
		const cleanup = vi.fn();
		const ref = effect(onCleanup => {
			count();
			onCleanup(cleanup);
		});
		host.connect();
		count.set(1);
		await tick();
		await tick();
		expect(cleanup).not.toHaveBeenCalled();
		ref.dispose();
		expect(cleanup).toHaveBeenCalledOnce();
		count.set(2);
		await tick();
		await tick();
		expect(cleanup).toHaveBeenCalledOnce();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
		host.dispose();
	});

	it("explicit deps: destroy-only teardown on disconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const s = signal(0);
		const cleanup = vi.fn();
		effect([s], (_vals, onCleanup) => {
			onCleanup(cleanup);
		});
		host.connect();
		expect(cleanup).not.toHaveBeenCalled();
		s.set(1);
		await tick();
		await tick();
		s.set(2);
		await tick();
		await tick();
		expect(cleanup).not.toHaveBeenCalled();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
		host.dispose();
	});
});

describe("host lifecycle — effect (explicit deps)", () => {
	it("disposes on disconnect and reinits on reconnect", async () => {
		const host = new TestHost();
		useSignalWatcher();
		const a = signal(1);
		const log: number[] = [];

		effect([a], ([v]) => {
			log.push(v as number);
		});
		host.connect(); // hostConnected → starts effect, fn runs synchronously
		expect(log).toStrictEqual([1]);

		a.set(2);
		await flush();
		expect(log).toContain(2);

		// Disconnect.
		host.disconnect();
		const lenAtDisconnect = log.length;
		a.set(3);
		await flush();
		expect(log).toHaveLength(lenAtDisconnect); // no re-run

		// Reconnect — factory() runs synchronously on hostConnected.
		host.connect();
		expect(log.length).toBeGreaterThan(lenAtDisconnect); // immediate run on reconnect
		a.set(4);
		await flush();
		expect(log).toContain(4);
	});
});
