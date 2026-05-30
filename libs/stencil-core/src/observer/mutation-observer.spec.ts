import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestHost } from "../testing/test-host";
import { mutationObserver } from "./mutation-observer";

// ─── Mock MutationObserver ────────────────────────────────────────────────────

class MockMutationObserver {
	static instances: MockMutationObserver[] = [];

	readonly observed: { target: Element; options: MutationObserverInit }[] = [];
	isDisconnected = false;

	constructor(private readonly cb: MutationCallback) {
		MockMutationObserver.instances.push(this);
	}

	observe(target: Element, options: MutationObserverInit): void {
		this.observed.push({ target, options });
	}

	disconnect(): void {
		this.observed.length = 0;
		this.isDisconnected = true;
	}

	fire(records: MutationRecord[]): void {
		this.cb(records, this as unknown as MutationObserver);
	}

	static reset(): void {
		MockMutationObserver.instances = [];
	}
}

// ─── Record factory ───────────────────────────────────────────────────────────

function makeRecord(type: MutationRecordType = "childList"): MutationRecord {
	return {
		type,
		target: {} as Node,
		addedNodes: { length: 0 } as unknown as NodeList,
		removedNodes: { length: 0 } as unknown as NodeList,
		previousSibling: null,
		nextSibling: null,
		attributeName: null,
		attributeNamespace: null,
		oldValue: null,
	} as MutationRecord;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mutationObserver", () => {
	beforeEach(() => {
		vi.stubGlobal("MutationObserver", MockMutationObserver);
	});

	afterEach(() => {
		MockMutationObserver.reset();
		vi.unstubAllGlobals();
	});

	it("callback invoked with records when observer fires", () => {
		const host = new TestHost();
		const callback = vi.fn<(records: readonly MutationRecord[]) => void>();
		mutationObserver(() => ({}) as Element, callback, { childList: true });

		host.connect();
		const records = [makeRecord("childList")];
		MockMutationObserver.instances[0]!.fire(records);

		expect(callback).toHaveBeenCalledWith(records);
	});

	it("no observer created when target returns null", () => {
		const host = new TestHost();
		mutationObserver(() => null, vi.fn<(records: readonly MutationRecord[]) => void>());

		host.connect();

		expect(MockMutationObserver.instances).toHaveLength(0);
	});

	it.each([
		{ childList: true },
		{ attributes: true },
		{ attributes: true, attributeFilter: ["class", "id"] },
		{ characterData: true, characterDataOldValue: true },
		{ childList: true, subtree: true },
		{ attributes: true, attributeOldValue: true },
	])("options forwarded to observe(): %o", options => {
		const host = new TestHost();
		const target = {} as Element;
		mutationObserver(() => target, vi.fn(), options);

		host.connect();

		expect(MockMutationObserver.instances[0]!.observed[0]!.options).toMatchObject(options);
	});

	it("multiple targets: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		mutationObserver([() => t1, () => t2], vi.fn<(records: readonly MutationRecord[]) => void>(), { childList: true });

		host.connect();

		const observedTargets = MockMutationObserver.instances[0]!.observed.map(o => o.target);
		expect(observedTargets).toStrictEqual([t1, t2]);
	});

	it("array-getter target: all elements observed", () => {
		const host = new TestHost();
		const t1 = {} as Element;
		const t2 = {} as Element;
		mutationObserver(() => [t1, t2], vi.fn<(records: readonly MutationRecord[]) => void>(), { childList: true });

		host.connect();

		const observedTargets = MockMutationObserver.instances[0]!.observed.map(o => o.target);
		expect(observedTargets).toStrictEqual([t1, t2]);
	});

	it("hostDisconnected disconnects the observer", () => {
		const host = new TestHost();
		mutationObserver(() => ({}) as Element, vi.fn<(records: readonly MutationRecord[]) => void>(), { childList: true });

		host.connect();
		host.disconnect();

		expect(MockMutationObserver.instances[0]!.isDisconnected).toBeTruthy();
	});

	it("reconnect re-creates observer and callback fires again", () => {
		const host = new TestHost();
		const callback = vi.fn<(records: readonly MutationRecord[]) => void>();
		mutationObserver(() => ({}) as Element, callback, { childList: true });

		host.connect();
		MockMutationObserver.instances[0]!.fire([makeRecord("childList")]);
		host.disconnect();

		host.connect();
		MockMutationObserver.instances[1]!.fire([makeRecord("attributes")]);

		expect(callback).toHaveBeenCalledTimes(2);
	});

	it("destroy() disconnects the observer", () => {
		const host = new TestHost();
		const ref = mutationObserver(() => ({}) as Element, vi.fn<(records: readonly MutationRecord[]) => void>(), {
			childList: true,
		});

		host.connect();
		ref.destroy();

		expect(MockMutationObserver.instances[0]!.isDisconnected).toBeTruthy();
	});

	it("destroy() prevents new observer on reconnect", () => {
		const host = new TestHost();
		const ref = mutationObserver(() => ({}) as Element, vi.fn<(records: readonly MutationRecord[]) => void>(), {
			childList: true,
		});

		host.connect();
		ref.destroy();
		host.disconnect();
		host.connect();

		expect(MockMutationObserver.instances).toHaveLength(1);
	});

	it("ssr: no observer created when MutationObserver is not available", () => {
		vi.stubGlobal("MutationObserver", null);
		const host = new TestHost();

		expect(() => {
			mutationObserver(() => ({}) as Element, vi.fn<(records: readonly MutationRecord[]) => void>(), {
				childList: true,
			});
			host.connect();
		}).not.toThrow();

		expect(MockMutationObserver.instances).toHaveLength(0);
	});
});
