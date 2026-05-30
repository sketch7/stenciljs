import { afterEach, describe, expect, it, vi } from "vitest";

import { debounceCallback, throttleCallback } from "../../src/scheduling";

afterEach(() => {
	vi.useRealTimers();
});

describe("debounceCallback", () => {
	it("fires once after the quiet window with the last args", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounceCallback(fn, 100);

		debounced(1);
		debounced(2);
		debounced(3);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(3);
	});

	it("resets the timer on each call", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounceCallback(fn, 100);

		debounced("a");
		vi.advanceTimersByTime(60);
		debounced("b");
		vi.advanceTimersByTime(60);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(40);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith("b");
	});

	it("cancel() clears the pending call", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounceCallback(fn, 100);

		debounced("x");
		debounced.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
	});
});

describe("throttleCallback", () => {
	it("invokes immediately on the leading edge", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const throttled = throttleCallback(fn, 100);

		throttled(1);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(1);
	});

	it("coalesces calls within the window and flushes the trailing one", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const throttled = throttleCallback(fn, 100);

		throttled(1); // leading
		throttled(2);
		throttled(3); // buffered as trailing
		expect(fn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith(3);
	});

	it("cancel() drops the trailing call", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const throttled = throttleCallback(fn, 100);

		throttled(1);
		throttled(2);
		throttled.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
