import { describe, it, expect, vi, expectTypeOf } from "vitest";

import { effectOnceIf } from "../src/extensions/effect-once-if";
import { signal, computed } from "../src/tc39";

// Helper: flush all pending microtasks
const tick = () =>
	new Promise<void>(r => {
		queueMicrotask(r);
	});

describe("effectOnceIf", () => {
	it("executes once when condition becomes truthy", async () => {
		const condition = signal(false);
		const execution = vi.fn();

		effectOnceIf(() => condition(), execution);

		expect(execution).not.toHaveBeenCalled();

		condition.set(true);
		await tick();
		expect(execution).toHaveBeenCalledOnce();
		expect(execution).toHaveBeenCalledWith(true);
	});

	it("executes immediately if condition is truthy on first run", () => {
		const execution = vi.fn();

		effectOnceIf(() => true, execution);

		expect(execution).toHaveBeenCalledOnce();
		expect(execution).toHaveBeenCalledWith(true);
	});

	it("disposes after execution", async () => {
		const condition = signal(false);
		const execution = vi.fn();

		const ref = effectOnceIf(() => condition(), execution);

		// Verify ref has dispose method
		expect(ref).toHaveProperty("dispose");
		expectTypeOf(ref.dispose).toBeFunction();

		condition.set(true);
		await tick();
		expect(execution).toHaveBeenCalledOnce();

		// Update condition again — execution should not be called
		condition.set(false);
		condition.set(true);
		await tick();
		expect(execution).toHaveBeenCalledOnce();
	});

	it("passes non-nullish value to execution", async () => {
		const execution = vi.fn();
		const condition = signal<number | null>(null);

		effectOnceIf(() => condition(), execution);

		expect(execution).not.toHaveBeenCalled();

		condition.set(42);
		await tick();
		expect(execution).toHaveBeenCalledWith(42);
	});

	it.each([
		[0, "zero"],
		[false, "false"],
		["", "empty string"],
		[null, "null"],
		[undefined, "undefined"],
	])("does not execute for falsy value: %o", falsy => {
		const condition = signal(falsy);
		const execution = vi.fn();

		effectOnceIf(() => condition(), execution);

		expect(execution).not.toHaveBeenCalled();
	});

	it("tracks signal reads in condition", async () => {
		const count = signal(0);
		const execution = vi.fn();
		let conditionRunCount = 0;

		effectOnceIf(() => {
			conditionRunCount++;
			return count() > 2;
		}, execution);

		expect(conditionRunCount).toBe(1);
		expect(execution).not.toHaveBeenCalled();

		count.set(1);
		await tick();
		expect(conditionRunCount).toBe(2);

		count.set(3);
		await tick();
		expect(conditionRunCount).toBe(3);
		expect(execution).toHaveBeenCalledOnce();

		// After execution, further condition changes should not re-run condition
		count.set(4);
		await tick();
		expect(conditionRunCount).toBe(3); // no change
	});

	it("executes in untracked context", async () => {
		const counter = signal(0);
		const condition = signal(false);
		const execution = vi.fn();

		effectOnceIf(() => condition(), execution);

		condition.set(true);
		await tick();
		expect(execution).toHaveBeenCalledWith(true);

		// Verify that reading counter in execution doesn't create a dependency
		// (if it did, changing counter after disposal would cause issues)
		const executionWithRead = vi.fn((_val: boolean) => {
			counter();
		});

		const condition2 = signal(false);
		effectOnceIf(() => condition2(), executionWithRead);
		condition2.set(true);
		await tick();

		counter.set(1);
		counter.set(2);
		// No re-execution because the effect was disposed
		expect(executionWithRead).toHaveBeenCalledOnce();
	});

	it("handles computed conditions", async () => {
		const threshold = signal(10);
		const value = signal(5);
		const isAboveThreshold = computed(() => value() > threshold());
		const execution = vi.fn();

		effectOnceIf(() => isAboveThreshold(), execution);

		expect(execution).not.toHaveBeenCalled();

		value.set(15);
		await tick();
		expect(execution).toHaveBeenCalledOnce();
		expect(execution).toHaveBeenCalledWith(true);
	});

	it("supports multiple independent effectOnceIf instances", async () => {
		const cond1 = signal(false);
		const cond2 = signal(false);
		const exec1 = vi.fn();
		const exec2 = vi.fn();

		effectOnceIf(() => cond1(), exec1);
		effectOnceIf(() => cond2(), exec2);

		cond1.set(true);
		await tick();
		expect(exec1).toHaveBeenCalledOnce();
		expect(exec2).not.toHaveBeenCalled();

		cond2.set(true);
		await tick();
		expect(exec1).toHaveBeenCalledOnce();
		expect(exec2).toHaveBeenCalledOnce();
	});

	it("can be manually disposed before condition is met", () => {
		const condition = signal(false);
		const execution = vi.fn();

		const ref = effectOnceIf(() => condition(), execution);

		ref.dispose();

		condition.set(true);
		expect(execution).not.toHaveBeenCalled();
	});

	it("handles object/array truthy values correctly", async () => {
		const execution = vi.fn();
		const condition = signal<Record<string, number> | null>(null);

		effectOnceIf(() => condition(), execution);

		expect(execution).not.toHaveBeenCalled();

		const obj = { count: 42 };
		condition.set(obj);
		await tick();
		expect(execution).toHaveBeenCalledWith(obj);
	});

	it("executes multiple conditions independently", async () => {
		const user = signal<{ id: number } | null>(null);
		const theme = signal<string | null>(null);
		const userLoaded = vi.fn();
		const themeLoaded = vi.fn();

		effectOnceIf(() => user(), userLoaded);
		effectOnceIf(() => theme(), themeLoaded);

		user.set({ id: 123 });
		await tick();
		expect(userLoaded).toHaveBeenCalledOnce();
		expect(themeLoaded).not.toHaveBeenCalled();

		theme.set("dark");
		await tick();
		expect(userLoaded).toHaveBeenCalledOnce();
		expect(themeLoaded).toHaveBeenCalledOnce();
	});
});
