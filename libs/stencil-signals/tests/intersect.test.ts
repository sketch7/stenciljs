import { TestHost } from "@ssv/stencil-core/testing";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { intersect } from "../src/extensions/intersect";

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

describe("intersect", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	afterEach(() => {
		MockIntersectionObserver.reset();
		vi.unstubAllGlobals();
	});

	it("returns undefined before first observation", () => {
		const host = new TestHost();
		const $entry = intersect(() => ({}) as Element);
		host.connect();

		expect($entry()).toBeUndefined();
	});

	it("respects custom initialValue", () => {
		const host = new TestHost();
		const initial = makeEntry(false, 0);
		const $entry = intersect(() => ({}) as Element, { initialValue: initial });
		host.connect();

		expect($entry()).toBe(initial);
	});

	it("updates signal when observer fires", () => {
		const host = new TestHost();
		const $entry = intersect(() => ({}) as Element);
		host.connect();
		const entry = makeEntry(true, 0.75);
		MockIntersectionObserver.instances[0]!.fire([entry]);

		expect($entry()).toBe(entry);
	});

	it.each([
		{ isIntersecting: true, ratio: 1 },
		{ isIntersecting: false, ratio: 0 },
	])("stores entry with isIntersecting=$isIntersecting", ({ isIntersecting, ratio }) => {
		const host = new TestHost();
		const $entry = intersect(() => ({}) as Element);
		host.connect();
		MockIntersectionObserver.instances[0]!.fire([makeEntry(isIntersecting, ratio)]);

		expect($entry()?.isIntersecting).toBe(isIntersecting);
		expect($entry()?.intersectionRatio).toBe(ratio);
	});

	it("forwards root, rootMargin, and threshold options to IntersectionObserver", () => {
		const host = new TestHost();
		const root = {} as Element;
		intersect(() => ({}) as Element, { root, rootMargin: "10px", threshold: [0, 0.5, 1] });
		host.connect();

		expect(MockIntersectionObserver.instances[0]!.options).toStrictEqual({
			root,
			rootMargin: "10px",
			threshold: [0, 0.5, 1],
		});
	});

	it("resets to undefined on disconnect", () => {
		const host = new TestHost();
		const $entry = intersect(() => ({}) as Element);
		host.connect();
		MockIntersectionObserver.instances[0]!.fire([makeEntry()]);
		expect($entry()).toBeDefined();

		host.disconnect();

		expect($entry()).toBeUndefined();
	});

	it("resets to custom initialValue on disconnect", () => {
		const host = new TestHost();
		const initial = makeEntry(false, 0);
		const $entry = intersect(() => ({}) as Element, { initialValue: initial });
		host.connect();
		MockIntersectionObserver.instances[0]!.fire([makeEntry(true, 1)]);
		host.disconnect();

		expect($entry()).toBe(initial);
	});

	describe("when IntersectionObserver is unavailable (SSR)", () => {
		beforeEach(() => {
			vi.unstubAllGlobals();
			delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
		});

		it("signal stays at initialValue", () => {
			const host = new TestHost();
			const $entry = intersect(() => ({}) as Element);
			host.connect();

			expect($entry()).toBeUndefined();
		});
	});
});
