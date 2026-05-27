import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";

import { TestHost } from "@ssv/stencil-core/testing";

import { createNotifier } from "../src/extensions/create-notifier";
import { effect } from "../src/extensions/effect";
import { signal } from "../src/signals/core";
import { useSignalWatcher } from "../src/controllers/signal-watcher-controller";

const tick = () =>
	new Promise<void>(r => {
		queueMicrotask(r);
	});

describe("createNotifier", () => {
	it("listen triggers an effect on init", () => {
		const testFn = vi.fn();
		const trigger = createNotifier();

		effect(() => {
			trigger.listen();
			testFn();
		});

		expect(testFn).toHaveBeenCalledOnce();
	});

	it("does not call handler until notify when guarded by truthiness", async () => {
		const testFn = vi.fn();
		const trigger = createNotifier();

		effect(() => {
			if (trigger.listen()) {
				testFn();
			}
		});

		expect(testFn).not.toHaveBeenCalled();

		trigger.notify();
		await tick();
		await tick();
		expect(testFn).toHaveBeenCalledOnce();
	});

	it("triggers on each subsequent notify call", async () => {
		const testFn = vi.fn();
		const trigger = createNotifier();

		effect(() => {
			if (trigger.listen()) {
				testFn();
			}
		});

		expect(testFn).not.toHaveBeenCalled();

		trigger.notify();
		await tick();
		await tick();
		expect(testFn).toHaveBeenCalledOnce();

		trigger.notify();
		await tick();
		await tick();
		expect(testFn).toHaveBeenCalledTimes(2);
	});

	it("listen starts at 0 with no deps", () => {
		const trigger = createNotifier();
		expect(trigger.listen()).toBe(0);
	});

	it("listen increments by 1 on each notify", async () => {
		const trigger = createNotifier();
		expect(trigger.listen()).toBe(0);

		trigger.notify();
		expect(trigger.listen()).toBe(1);

		trigger.notify();
		expect(trigger.listen()).toBe(2);
	});

	describe("with deps", () => {
		it("starts listen at 1 when depsEmitInitially=true (default)", () => {
			const dep = signal<unknown>(null);
			const trigger = createNotifier({ deps: [dep] });
			expect(trigger.listen()).toBe(1);
		});

		it("starts listen at 0 when depsEmitInitially=false", () => {
			const dep = signal<unknown>(null);
			const trigger = createNotifier({ deps: [dep], depsEmitInitially: false });
			expect(trigger.listen()).toBe(0);
		});

		it("increments on notify and dep changes (depsEmitInitially=true)", async () => {
			let notifyValue!: number;
			const dep1 = signal<unknown>(null);
			const dep2 = signal<unknown>(null);
			const testFn = vi.fn();
			const trigger = createNotifier({ deps: [dep1, dep2] });

			effect(() => {
				notifyValue = trigger.listen();
				testFn();
			});

			expect(testFn).toHaveBeenCalledOnce();
			expect(notifyValue).toBe(1);

			trigger.notify();
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(2);
			expect(notifyValue).toBe(2);

			dep1.set(1);
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(3);
			expect(notifyValue).toBe(3);

			dep1.set(2);
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(4);
			expect(notifyValue).toBe(4);

			dep1.set(2); // same value — no re-run
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(4);
			expect(notifyValue).toBe(4);

			trigger.notify();
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(5);
			expect(notifyValue).toBe(5);
		});

		it("starts at 0 and increments on dep changes (depsEmitInitially=false)", async () => {
			let notifyValue!: number;
			const dep1 = signal<unknown>(null);
			const dep2 = signal<unknown>(null);
			const testFn = vi.fn();
			const trigger = createNotifier({ deps: [dep1, dep2], depsEmitInitially: false });

			effect(() => {
				notifyValue = trigger.listen();
				testFn();
			});

			expect(testFn).toHaveBeenCalledOnce();
			expect(notifyValue).toBe(0);

			trigger.notify();
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(2);
			expect(notifyValue).toBe(1);

			dep1.set(1);
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(3);
			expect(notifyValue).toBe(2);

			dep1.set(2);
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(4);
			expect(notifyValue).toBe(3);

			dep1.set(2); // same value — no re-run
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(4);
			expect(notifyValue).toBe(3);

			trigger.notify();
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(5);
			expect(notifyValue).toBe(4);
		});

		it("tracks all provided deps independently", async () => {
			const dep1 = signal<unknown>(null);
			const dep2 = signal<unknown>(null);
			const testFn = vi.fn();
			const trigger = createNotifier({ deps: [dep1, dep2] });

			effect(() => {
				trigger.listen();
				testFn();
			});

			const callsAfterInit = testFn.mock.calls.length;

			dep1.set("a");
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(callsAfterInit + 1);

			dep2.set("b");
			await tick();
			await tick();
			expect(testFn).toHaveBeenCalledTimes(callsAfterInit + 2);
		});
	});

	describe("dispose", () => {
		it("dispose() is a no-op for a no-deps notifier", () => {
			const trigger = createNotifier();
			expect(() => trigger.dispose()).not.toThrow();
			trigger.notify();
			expect(trigger.listen()).toBe(1);
		});

		it("dispose() stops the inner dep-tracking effect", async () => {
			const dep = signal<unknown>(null);
			const trigger = createNotifier({ deps: [dep] });
			expect(trigger.listen()).toBe(1); // depsEmitInitially default

			trigger.dispose();

			dep.set("changed");
			await tick();
			await tick();
			expect(trigger.listen()).toBe(1); // unchanged — inner effect stopped
		});

		describe("inside a component", () => {
			let host: TestHost;

			beforeEach(() => {
				host = new TestHost();
			});

			afterEach(() => {
				host.dispose();
			});

			it("dep-tracking effect is disposed when the component disconnects", async () => {
				useSignalWatcher();
				const dep = signal<unknown>(null);
				const trigger = createNotifier({ deps: [dep] });

				host.connect();

				dep.set("a");
				await tick();
				await tick();
				expect(trigger.listen()).toBe(2); // 1 (initial) + 1 dep change

				host.disconnect();

				dep.set("b");
				await tick();
				await tick();
				expect(trigger.listen()).toBe(2); // unchanged — inner effect disposed on disconnect
			});
		});
	});
});
