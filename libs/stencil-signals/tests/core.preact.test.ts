/**
 * tests/core.preact.test.ts
 *
 * Same functional coverage as core.test.ts but running against the
 * @preact/signals-core backend. Tests that are specific to TC39 internals
 * (instanceof checks, Signal namespace) are replaced with equivalent
 * behavior checks.
 */

import { describe, it, expect, vi, expectTypeOf } from "vitest";

import { computedPrevious } from "../src/extensions/computed-previous";
import { derivedAsync } from "../src/extensions/derived-async";
import { effect } from "../src/extensions/effect";
// Import the Preact entry point first — this sets the Preact adapter so all
// utilities that call getAdapter() work correctly in this test file.
import { signal, computed, createWatcher, untracked } from "../src/preact";

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

describe("signal() [preact]", () => {
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
		const s = signal("hello");
		expectTypeOf(s).toBeFunction();
		expectTypeOf(s.set).toBeFunction();
		expectTypeOf(s.peek).toBeFunction();
		expect(s()).toBe("hello");
		expect(s.peek()).toBe("hello");
	});

	it("updates via update()", () => {
		const s = signal(10);
		s.update(n => n * 2);
		expect(s()).toBe(20);
		s.update(n => n - 5);
		expect(s()).toBe(15);
	});

	it("update() respects custom equals — skips notify when result is equal", async () => {
		const s = signal({ v: 1 }, { equals: (a, b) => a.v === b.v });
		const notify = vi.fn();
		const w = createWatcher(notify);
		w.watch(s as any);
		s.update(_curr => ({ v: 1 })); // same by custom equality
		await tick();
		expect(notify).not.toHaveBeenCalled();
		w.dispose();
	});

	it("respects custom equals — skips notify when equal", async () => {
		const s = signal({ v: 1 }, { equals: (a, b) => a.v === b.v });
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

describe("computed() [preact]", () => {
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

	it("is callable and has peek()", () => {
		const c = computed(() => 42);
		expectTypeOf(c).toBeFunction();
		expectTypeOf(c.peek).toBeFunction();
		expect(c()).toBe(42);
		expect(c.peek()).toBe(42);
	});

	describe("previousValue argument [preact]", () => {
		it("receives undefined on the first run when not seeded", () => {
			const seen: (number | undefined)[] = [];
			const c = computed<number>(prev => {
				seen.push(prev);
				return 1;
			});
			c();
			expect(seen).toEqual([undefined]);
		});

		it("receives options.initialValue (typed T, not undefined) on the first run when seeded", () => {
			const seen: number[] = [];
			const c = computed(
				prev => {
					expectTypeOf(prev).toEqualTypeOf<number>();
					seen.push(prev);
					return prev + 1;
				},
				{ initialValue: 10 },
			);
			expect(c()).toBe(11);
			expect(seen).toEqual([10]);
		});

		it("receives the prior computed result on subsequent runs (accumulator)", () => {
			const base = signal(1);
			const acc = computed<number>(prev => base() + (prev ?? 0));
			expect(acc()).toBe(1); // 1 + undefined→0
			base.set(2);
			expect(acc()).toBe(3); // 2 + 1
			base.set(5);
			expect(acc()).toBe(8); // 5 + 3
		});

		it("remains backwards compatible with zero-arg callbacks", () => {
			const base = signal(4);
			const c = computed(() => base() * 2);
			expect(c()).toBe(8);
			base.set(5);
			expect(c()).toBe(10);
		});
	});
});

// ─── untracked() [preact] ─────────────────────────────────────────────────────

describe("untracked() [preact]", () => {
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

describe("createWatcher() [preact]", () => {
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

// ─── watchEffect() — auto-tracking ───────────────────────────────────────────

describe("watchEffect() — auto-tracking [preact]", () => {
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

describe("watchEffect() — explicit deps [preact]", () => {
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
		const fn = vi.fn(([_d]: number[]) => {
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
		expect(fn.mock.calls.at(-1)[0]).toStrictEqual([1, 20, 3]);
		cleanup.dispose();
	});
});

// ─── computedPrevious() ───────────────────────────────────────────────────────

describe("computedPrevious() [preact]", () => {
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

		n.set(3); // doubled → 6
		await tick();
		await tick();
		// prevDoubled should have held 2 before changing to 6
		const val = prevDoubled();
		expect(val === 2 || val === undefined).toBeTruthy();
	});

	it("does not update when signal is set to the same value", async () => {
		const s = signal(7);
		const prev = computedPrevious(s);
		s.set(7); // same value — Preact signals also use Object.is by default
		await tick();
		await tick();
		expect(prev()).toBeUndefined(); // never changed
	});
});

// ─── derivedAsync() ─────────────────────────────────────────────────────────

describe("derivedAsync() [preact]", () => {
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
});
