import type { ResizeObserverOptions } from "@ssv/stencil-core/dom";
import { TestHost } from "@ssv/stencil-core/testing";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { elementSize } from "../src/extensions/element-size";

// ─── Mock ResizeObserver ──────────────────────────────────────────────────────

class MockResizeObserver {
	static instances: MockResizeObserver[] = [];

	readonly observed: { target: Element; options?: ResizeObserverOptions }[] = [];
	isDisconnected = false;

	constructor(private readonly cb: ResizeObserverCallback) {
		MockResizeObserver.instances.push(this);
	}

	observe(target: Element, options?: ResizeObserverOptions): void {
		this.observed.push({ target, options });
	}

	unobserve(target: Element): void {
		const idx = this.observed.findIndex(o => o.target === target);
		if (idx !== -1) {
			this.observed.splice(idx, 1);
		}
	}

	disconnect(): void {
		this.observed.length = 0;
		this.isDisconnected = true;
	}

	fire(entries: ResizeObserverEntry[]): void {
		this.cb(entries, this as unknown as ResizeObserver);
	}

	static reset(): void {
		MockResizeObserver.instances = [];
	}
}

// ─── Entry factory ────────────────────────────────────────────────────────────

function makeEntry(width = 100, height = 50): ResizeObserverEntry {
	return {
		target: {} as Element,
		contentRect: {
			width,
			height,
			top: 0,
			right: width,
			bottom: height,
			left: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRectReadOnly,
		contentBoxSize: [{ inlineSize: width, blockSize: height }],
		borderBoxSize: [{ inlineSize: width + 20, blockSize: height + 10 }],
		devicePixelContentBoxSize: [{ inlineSize: width * 2, blockSize: height * 2 }],
	} as ResizeObserverEntry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("elementSize", () => {
	beforeEach(() => {
		vi.stubGlobal("ResizeObserver", MockResizeObserver);
	});

	afterEach(() => {
		MockResizeObserver.reset();
		vi.unstubAllGlobals();
	});

	it("returns default initialValue before first measurement", () => {
		const host = new TestHost();
		const size = elementSize(() => ({}) as Element);
		host.connect();

		expect(size()).toStrictEqual({ width: 0, height: 0 });
	});

	it("accepts custom initialValue", () => {
		const host = new TestHost();
		const size = elementSize(() => ({}) as Element, { initialValue: { width: 100, height: 50 } });
		host.connect();

		expect(size()).toStrictEqual({ width: 100, height: 50 });
	});

	it.each([
		{ box: "border-box" as ResizeObserverBoxOptions, expectedWidth: 320, expectedHeight: 160 },
		{ box: "content-box" as ResizeObserverBoxOptions, expectedWidth: 300, expectedHeight: 150 },
	])("box $box: updates signal with correct dimensions on resize", ({ box, expectedWidth, expectedHeight }) => {
		const host = new TestHost();
		const size = elementSize(() => ({}) as Element, { box });
		host.connect();
		MockResizeObserver.instances[0]!.fire([makeEntry(300, 150)]);

		expect(size()).toStrictEqual({ width: expectedWidth, height: expectedHeight });
	});

	it.each([{ box: "border-box" as ResizeObserverBoxOptions }, { box: "content-box" as ResizeObserverBoxOptions }])(
		"box $box: falls back to contentRect when size array is empty",
		({ box }) => {
			const host = new TestHost();
			const size = elementSize(() => ({}) as Element, { box });
			host.connect();
			const emptyEntry = {
				...makeEntry(300, 150),
				borderBoxSize: [],
				contentBoxSize: [],
			} as unknown as ResizeObserverEntry;
			MockResizeObserver.instances[0]!.fire([emptyEntry]);

			expect(size()).toStrictEqual({ width: 300, height: 150 });
		},
	);

	it.each([
		{ box: undefined, expectedBox: "border-box" },
		{ box: "content-box" as ResizeObserverBoxOptions, expectedBox: "content-box" },
		{ box: "border-box" as ResizeObserverBoxOptions, expectedBox: "border-box" },
	])("box option '$box' forwarded to ResizeObserver.observe() as '$expectedBox'", ({ box, expectedBox }) => {
		const host = new TestHost();
		const target = {} as Element;
		elementSize(() => target, { box });
		host.connect();

		expect(MockResizeObserver.instances[0]!.observed[0]!.options).toStrictEqual({ box: expectedBox });
	});

	it("resets to initialValue on disconnect", () => {
		const host = new TestHost();
		const size = elementSize(() => ({}) as Element);
		host.connect();
		MockResizeObserver.instances[0]!.fire([makeEntry(300, 150)]);
		expect(size()).toStrictEqual({ width: 320, height: 160 });

		host.disconnect();

		expect(size()).toStrictEqual({ width: 0, height: 0 });
	});

	it("resets to custom initialValue on disconnect", () => {
		const host = new TestHost();
		const size = elementSize(() => ({}) as Element, { initialValue: { width: 10, height: 5 } });
		host.connect();
		MockResizeObserver.instances[0]!.fire([makeEntry(300, 150)]);
		host.disconnect();

		expect(size()).toStrictEqual({ width: 10, height: 5 });
	});

	describe("when ResizeObserver is unavailable (SSR)", () => {
		beforeEach(() => {
			vi.unstubAllGlobals();
			delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
		});

		it("signal stays at initialValue", () => {
			const host = new TestHost();
			const size = elementSize(() => ({}) as Element);
			host.connect();

			expect(size()).toStrictEqual({ width: 0, height: 0 });
		});
	});
});
