/**
 * tests/signal-store.tc39.test.ts
 *
 * Unit tests for the composable @ssv/stencil-signals/signal-store API,
 * running against the TC39 adapter.
 */

import { describe, it, expect, vi } from "vitest";

import { effect } from "../src/extensions/effect";
import {
	signalStore,
	signalStoreFeature,
	withState,
	withComputed,
	withMethods,
	withConfig,
	patchState,
	getState,
	getInitialState,
} from "../src/signal-store";
// Import the TC39 entry point first — this sets the TC39 adapter so all
// utilities that call getAdapter() work correctly in this test file.
import { computed } from "../src/tc39";

const tick = () =>
	new Promise<void>(r => {
		queueMicrotask(r);
	});

describe("signalStore() [tc39]", () => {
	it("reads initial state values", () => {
		const store = signalStore(withState({ name: "Alice", age: 30 }));
		expect(store.name()).toBe("Alice");
		expect(store.age()).toBe(30);
	});

	it("exposes state as writable by default — .set / .update work externally", () => {
		const store = signalStore(withState({ count: 0 }));
		store.count.set(5);
		expect(store.count()).toBe(5);
		store.count.update(c => c + 1);
		expect(store.count()).toBe(6);
	});

	it("derives reactive values via withComputed", () => {
		const store = signalStore(
			withState({ price: 10, qty: 3 }),
			withComputed(s => ({ total: computed(() => s.price() * s.qty()) })),
		);
		expect(store.total()).toBe(30);
		store.price.set(20);
		expect(store.total()).toBe(60);
	});

	it("attaches methods that read and mutate state via withMethods", () => {
		const store = signalStore(
			withState({ todos: [] as { id: number; done: boolean }[], nextId: 1 }),
			withMethods(s => ({
				add() {
					patchState(s, state => ({
						todos: [...state.todos, { id: state.nextId, done: false }],
						nextId: state.nextId + 1,
					}));
				},
				toggle(id: number) {
					s.todos.update(items => items.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
				},
			})),
		);
		store.add();
		store.add();
		expect(store.todos()).toStrictEqual([
			{ id: 1, done: false },
			{ id: 2, done: false },
		]);
		store.toggle(1);
		expect(store.todos()[0].done).toBe(true);
		expect(store.nextId()).toBe(3);
	});

	it("lets later features read earlier computed values", () => {
		const store = signalStore(
			withState({ a: 2 }),
			withComputed(s => ({ doubled: computed(() => s.a() * 2) })),
			withMethods(s => ({
				readDoubled: () => s.doubled(),
			})),
		);
		expect(store.readDoubled()).toBe(4);
	});

	describe("patchState()", () => {
		it("applies a partial object", () => {
			const store = signalStore(withState({ a: 1, b: 2 }));
			patchState(store, { b: 20 });
			expect(store.a()).toBe(1);
			expect(store.b()).toBe(20);
		});

		it("applies a function updater receiving current state", () => {
			const store = signalStore(withState({ count: 5 }));
			patchState(store, s => ({ count: s.count * 2 }));
			expect(store.count()).toBe(10);
		});

		it("composes multiple updaters with fresh snapshots", () => {
			const store = signalStore(withState({ count: 0 }));
			patchState(
				store,
				s => ({ count: s.count + 1 }),
				s => ({ count: s.count + 10 }),
			);
			expect(store.count()).toBe(11);
		});

		it("batches all updates into a single effect re-run", async () => {
			const store = signalStore(withState({ a: 1, b: 1 }));
			const fn = vi.fn(() => {
				store.a();
				store.b();
			});
			const cleanup = effect(fn);
			expect(fn).toHaveBeenCalledOnce();
			patchState(store, { a: 2, b: 2 });
			await tick();
			await tick();
			cleanup.dispose();
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("throws on an unknown state key", () => {
			const store = signalStore(withState({ a: 1 }));
			expect(() => {
				patchState(store, { unknown: 2 } as never);
			}).toThrow(/unknown state key/);
		});
	});

	describe("getState() / getInitialState()", () => {
		it("returns a plain, non-reactive snapshot", () => {
			const store = signalStore(withState({ a: 1, b: 2 }));
			const snap = getState(store);
			expect(snap).toStrictEqual({ a: 1, b: 2 });
			store.a.set(99);
			// Snapshot is detached — unaffected by later writes.
			expect(snap.a).toBe(1);
		});

		it("does not subscribe the caller (peek-based)", async () => {
			const store = signalStore(withState({ a: 1 }));
			const fn = vi.fn(() => {
				getState(store);
			});
			const cleanup = effect(fn);
			expect(fn).toHaveBeenCalledOnce();
			store.a.set(2);
			await tick();
			await tick();
			cleanup.dispose();
			expect(fn).toHaveBeenCalledOnce();
		});

		it("supports the reset pattern via getInitialState", () => {
			const store = signalStore(withState({ a: 1, b: 2 }));
			store.a.set(99);
			store.b.set(99);
			patchState(store, getInitialState(store));
			expect(getState(store)).toStrictEqual({ a: 1, b: 2 });
		});
	});

	describe("withConfig({ isStateWritable: false })", () => {
		it("exposes state as read-only externally but reads still work", () => {
			const store = signalStore(withConfig({ isStateWritable: false }), withState({ count: 1 }));
			expect(store.count()).toBe(1);
			// Read-only signals have no .set / .update.
			expect((store.count as { set?: unknown }).set).toBeUndefined();
			expect((store.count as { update?: unknown }).update).toBeUndefined();
		});

		it("still allows methods and patchState to mutate", () => {
			const store = signalStore(
				withConfig({ isStateWritable: false }),
				withState({ count: 1 }),
				withMethods(s => ({
					inc() {
						s.count.update(c => c + 1);
					},
				})),
			);
			store.inc();
			expect(store.count()).toBe(2);
			patchState(store, { count: 10 });
			expect(store.count()).toBe(10);
		});
	});

	describe("signalStoreFeature()", () => {
		it("composes reusable features that fold into a store", () => {
			const withCounter = signalStoreFeature(
				withState({ count: 0 }),
				withComputed(s => ({ isZero: computed(() => s.count() === 0) })),
				withMethods(s => ({
					inc() {
						s.count.update(c => c + 1);
					},
				})),
			);
			const store = signalStore(withCounter);
			expect(store.count()).toBe(0);
			expect(store.isZero()).toBe(true);
			store.inc();
			expect(store.count()).toBe(1);
			expect(store.isZero()).toBe(false);
		});
	});

	it("throws on direct property assignment to the store", () => {
		const store = signalStore(withState({ a: 1 }));
		expect(() => {
			(store as unknown as Record<string, unknown>).a = 2;
		}).toThrow();
	});
});
