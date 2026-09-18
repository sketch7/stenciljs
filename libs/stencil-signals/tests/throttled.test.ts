import { afterEach, describe, expect, it, vi } from "vitest";

import { throttled } from "../src/extensions/rate-limited";
import { signal } from "../src/tc39";

// Flush real microtasks so the internal explicit-deps effect re-runs.
const flush = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

describe("throttled", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe("source overload", () => {
		it("mirrors the source initial value immediately", () => {
			vi.useFakeTimers();
			const source = signal(0);
			const view = throttled(source, 100);

			expect(view()).toBe(0);
			view.dispose();
		});

		it("coalesces rapid source changes and flushes the latest", async () => {
			vi.useFakeTimers();
			const source = signal(0);
			const view = throttled(source, 100);

			source.set(1);
			source.set(2);
			await flush();
			expect(view()).toBe(0); // throttled — leading edge consumed by initial value

			vi.advanceTimersByTime(100);
			expect(view()).toBe(2);

			view.dispose();
		});

		it("dispose() stops mirroring", async () => {
			vi.useFakeTimers();
			const source = signal(0);
			const view = throttled(source, 100);

			source.set(1);
			await flush();
			view.dispose();

			source.set(2);
			await flush();
			vi.advanceTimersByTime(100);
			expect(view()).toBe(0);
		});
	});

	describe("value overload", () => {
		it("applies the leading write immediately and throttles the rest", () => {
			vi.useFakeTimers();
			const value = throttled(0, 100);

			value.set(1); // leading edge → immediate
			expect(value()).toBe(1);

			value.set(2);
			value.set(3);
			expect(value()).toBe(1); // throttled

			vi.advanceTimersByTime(100);
			expect(value()).toBe(3); // trailing flush
		});

		it("dispose() drops the trailing write", () => {
			vi.useFakeTimers();
			const value = throttled(0, 100);

			value.set(1);
			value.set(2);
			value.dispose();
			vi.advanceTimersByTime(100);
			expect(value()).toBe(1);
		});
	});
});
