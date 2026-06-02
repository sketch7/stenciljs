import { afterEach, describe, expect, it, vi } from "vitest";

import { debounced } from "../src/extensions/rate-limited";
import { signal } from "../src/tc39";

// Flush real microtasks so the internal explicit-deps effect re-runs.
const flush = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

afterEach(() => {
	vi.useRealTimers();
});

describe("debounced — source overload", () => {
	it("mirrors the source after the quiet window", async () => {
		vi.useFakeTimers();
		const source = signal("a");
		const view = debounced(source, 100);

		expect(view()).toBe("a");

		source.set("ab");
		await flush();
		expect(view()).toBe("a"); // not yet — still within debounce window

		vi.advanceTimersByTime(100);
		expect(view()).toBe("ab");

		view.dispose();
	});

	it("dispose() stops mirroring and clears pending updates", async () => {
		vi.useFakeTimers();
		const source = signal(0);
		const view = debounced(source, 100);

		source.set(1);
		await flush();
		view.dispose();

		source.set(2);
		await flush();
		vi.advanceTimersByTime(100);
		expect(view()).toBe(0); // unchanged after dispose
	});
});

describe("debounced — value overload", () => {
	it("delays visible writes until the quiet window elapses", () => {
		vi.useFakeTimers();
		const value = debounced("", 100);

		expect(value()).toBe("");
		value.set("a");
		value.set("ab");
		expect(value()).toBe(""); // debounced

		vi.advanceTimersByTime(100);
		expect(value()).toBe("ab");
	});

	it("dispose() clears the pending write", () => {
		vi.useFakeTimers();
		const value = debounced("", 100);

		value.set("a");
		value.dispose();
		vi.advanceTimersByTime(100);
		expect(value()).toBe("");
	});
});
