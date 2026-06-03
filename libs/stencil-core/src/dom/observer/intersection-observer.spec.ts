import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestHost } from "../../testing/test-host";
import { intersectionObserver } from "./intersection-observer";

// ─── Mock IntersectionObserver ────────────────────────────────────────────────

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];

	readonly observed: Element[] = [];
	readonly options: IntersectionObserverInit | undefined;
	isDisconnected = false;

	constructor(
		private readonly cb: IntersectionObserverCallback,
		options?: IntersectionObserverInit,
	) {
		this.options = options;
		MockIntersectionObserver.instances.push(this);
	}

	observe(target: Element): void {
		this.observed.push(target);
	}

	unobserve(target: Element): void {
		const idx = this.observed.indexOf(target);
		if (idx !== -1) {
			this.observed.splice(idx, 1);
		}
	}

	disconnect(): void {
		this.observed.length = 0;
		this.isDisconnected = true;
	}

	fire(entries: IntersectionObserverEntry[]): void {
		this.cb(entries, this as unknown as IntersectionObserver);
	}

	static reset(): void {
		MockIntersectionObserver.instances = [];
	}
}

// ─── Entry factory ────────────────────────────────────────────────────────────

function makeEntry(isIntersecting = true, ratio = 1): IntersectionObserverEntry {
	return {
		target: {} as Element,
		isIntersecting,
		intersectionRatio: ratio,
		boundingClientRect: {} as DOMRectReadOnly,
		intersectionRect: {} as DOMRectReadOnly,
		rootBounds: null,
		time: 0,
	} as IntersectionObserverEntry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("intersectionObserver", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	afterEach(() => {
		MockIntersectionObserver.reset();
		vi.unstubAllGlobals();
	});

	it("callback invoked with entry when observer fires", () => {
		const host = new TestHost();
		const callback = vi.fn<(entry: IntersectionObserverEntry) => void>();
		intersectionObserver(() => ({}) as Element, callback);

		host.connect();
		const entries = [makeEntry(true, 1)];
		MockIntersectionObserver.instances[0].fire(entries);

		expect(callback).toHaveBeenCalledWith(entries[0]);
	});

	it("no observer created when target returns null", () => {
		const host = new TestHost();
		intersectionObserver(() => null, vi.fn<(entry: IntersectionObserverEntry) => void>());

		host.connect();

		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});

	it.each([{ rootMargin: "10px", threshold: 0.5 }, { threshold: [0.25, 0.75] }, { rootMargin: "0px 20px" }])(
		"options forwarded to native constructor: %o",
		options => {
			const host = new TestHost();
			intersectionObserver(() => ({}) as Element, vi.fn<() => void>(), options);

			host.connect();

			expect(MockIntersectionObserver.instances[0].options).toMatchObject(options);
		},
	);

	it("multiple targets: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		intersectionObserver([() => t1, () => t2], vi.fn<(entries: readonly IntersectionObserverEntry[]) => void>());

		host.connect();

		expect(MockIntersectionObserver.instances[0].observed).toStrictEqual([t1, t2]);
	});

	it("array-getter target: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		intersectionObserver(() => [t1, t2], vi.fn<(entries: readonly IntersectionObserverEntry[]) => void>());

		host.connect();

		expect(MockIntersectionObserver.instances[0].observed).toStrictEqual([t1, t2]);
	});

	it("hostDisconnected disconnects the observer", () => {
		const host = new TestHost();
		intersectionObserver(() => ({}) as Element, vi.fn<(entry: IntersectionObserverEntry) => void>());

		host.connect();
		host.disconnect();

		expect(MockIntersectionObserver.instances[0].isDisconnected).toBeTruthy();
	});

	it("reconnect re-creates observer and callback fires again", () => {
		const host = new TestHost();
		const callback = vi.fn<(entry: IntersectionObserverEntry) => void>();
		intersectionObserver(() => ({}) as Element, callback);

		host.connect();
		MockIntersectionObserver.instances[0].fire([makeEntry(true)]);
		host.disconnect();

		host.connect();
		MockIntersectionObserver.instances[1].fire([makeEntry(false)]);

		expect(callback).toHaveBeenCalledTimes(2);
	});

	it("destroy() disconnects the observer", () => {
		const host = new TestHost();
		const ref = intersectionObserver(() => ({}) as Element, vi.fn<(entry: IntersectionObserverEntry) => void>());

		host.connect();
		ref.destroy();

		expect(MockIntersectionObserver.instances[0].isDisconnected).toBeTruthy();
	});

	it("destroy() prevents new observer on reconnect", () => {
		const host = new TestHost();
		const ref = intersectionObserver(() => ({}) as Element, vi.fn<(entry: IntersectionObserverEntry) => void>());

		host.connect();
		ref.destroy();
		host.disconnect();
		host.connect();

		expect(MockIntersectionObserver.instances).toHaveLength(1);
	});

	it("ssr: no observer created when IntersectionObserver is not available", () => {
		vi.unstubAllGlobals();
		const host = new TestHost();

		expect(() => {
			intersectionObserver(() => ({}) as Element, vi.fn<(entry: IntersectionObserverEntry) => void>());
			host.connect();
		}).not.toThrow();

		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});
});
