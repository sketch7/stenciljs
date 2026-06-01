import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestHost } from "../../testing/test-host";
import { resizeObserver } from "./resize-observer";

// ─── Mock ResizeObserver ──────────────────────────────────────────────────────

class MockResizeObserver {
	static instances: MockResizeObserver[] = [];

	readonly observed: { target: Element; options?: ResizeObserverObserveOptions }[] = [];
	isDisconnected = false;

	constructor(private readonly cb: ResizeObserverCallback) {
		MockResizeObserver.instances.push(this);
	}

	observe(target: Element, options?: ResizeObserverObserveOptions): void {
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

describe("resizeObserver", () => {
	beforeEach(() => {
		vi.stubGlobal("ResizeObserver", MockResizeObserver);
	});

	afterEach(() => {
		MockResizeObserver.reset();
		vi.unstubAllGlobals();
	});

	it("callback invoked with entry when observer fires", () => {
		const host = new TestHost();
		const callback = vi.fn<(entry: ResizeObserverEntry) => void>();
		resizeObserver(() => ({}) as Element, callback);

		host.connect();
		const entries = [makeEntry(300, 150)];
		MockResizeObserver.instances[0]!.fire(entries);

		expect(callback).toHaveBeenCalledWith(entries[0]);
	});

	it("no observer created when target returns null", () => {
		const host = new TestHost();
		resizeObserver(() => null, vi.fn<(entry: ResizeObserverEntry) => void>());

		host.connect();

		expect(MockResizeObserver.instances).toHaveLength(0);
	});

	it("box option forwarded to observe()", () => {
		const host = new TestHost();
		const target = {} as Element;
		resizeObserver(() => target, vi.fn<(entry: ResizeObserverEntry) => void>(), { box: "border-box" });

		host.connect();

		expect(MockResizeObserver.instances[0]!.observed).toStrictEqual([{ target, options: { box: "border-box" } }]);
	});

	it("multiple targets: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		resizeObserver([() => t1, () => t2], vi.fn<(entries: readonly ResizeObserverEntry[]) => void>());

		host.connect();

		const observedTargets = MockResizeObserver.instances[0]!.observed.map(o => o.target);
		expect(observedTargets).toStrictEqual([t1, t2]);
	});

	it("array-getter target: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		resizeObserver(() => [t1, t2], vi.fn<(entries: readonly ResizeObserverEntry[]) => void>());

		host.connect();

		const observedTargets = MockResizeObserver.instances[0]!.observed.map(o => o.target);
		expect(observedTargets).toStrictEqual([t1, t2]);
	});

	it("hostDisconnected disconnects the observer", () => {
		const host = new TestHost();
		resizeObserver(() => ({}) as Element, vi.fn<(entry: ResizeObserverEntry) => void>());

		host.connect();
		host.disconnect();

		expect(MockResizeObserver.instances[0]!.isDisconnected).toBeTruthy();
	});

	it("reconnect re-creates observer and callback fires again", () => {
		const host = new TestHost();
		const callback = vi.fn<(entry: ResizeObserverEntry) => void>();
		resizeObserver(() => ({}) as Element, callback);

		host.connect();
		MockResizeObserver.instances[0]!.fire([makeEntry(100, 50)]);
		host.disconnect();

		host.connect();
		MockResizeObserver.instances[1]!.fire([makeEntry(250, 120)]);

		expect(callback).toHaveBeenCalledTimes(2);
	});

	it("destroy() disconnects the observer", () => {
		const host = new TestHost();
		const ref = resizeObserver(() => ({}) as Element, vi.fn<(entry: ResizeObserverEntry) => void>());

		host.connect();
		ref.destroy();

		expect(MockResizeObserver.instances[0]!.isDisconnected).toBeTruthy();
	});

	it("destroy() prevents new observer on reconnect", () => {
		const host = new TestHost();
		const ref = resizeObserver(() => ({}) as Element, vi.fn<(entry: ResizeObserverEntry) => void>());

		host.connect();
		ref.destroy();
		host.disconnect();
		host.connect();

		expect(MockResizeObserver.instances).toHaveLength(1);
	});

	it("ssr: no observer created when ResizeObserver is not available", () => {
		vi.unstubAllGlobals();
		const host = new TestHost();

		expect(() => {
			resizeObserver(() => ({}) as Element, vi.fn<(entry: ResizeObserverEntry) => void>());
			host.connect();
		}).not.toThrow();

		expect(MockResizeObserver.instances).toHaveLength(0);
	});
});
