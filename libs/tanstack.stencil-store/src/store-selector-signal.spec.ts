// oxlint-disable-next-line import/no-unassigned-import -- registers TC39 adapter before `@ssv/stencil-signals` primitives
import "@ssv/stencil-signals/tc39";
import { TestHost } from "@ssv/stencil.core/testing";
import { createStore } from "@tanstack/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSelectorSignal } from "./store-selector-signal";

describe("useSelectorSignal", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		host.dispose();
	});

	it("returns undefined before first render", () => {
		const store = createStore(42);
		const sig = useSelectorSignal(() => store);
		expect(sig()).toBeUndefined();
	});

	it("propagates store updates into the signal after subscribe", () => {
		const store = createStore(0);
		const sig = useSelectorSignal(() => store);
		host.render();

		expect(sig()).toBe(0);
		store.setState(() => 42);
		expect(sig()).toBe(42);
	});

	it("disconnect unsubscribes — external updates do not change the signal", () => {
		const store = createStore(0);
		const sig = useSelectorSignal(() => store);
		host.render();

		expect(sig()).toBe(0);
		host.disconnect();

		expect(sig()).toBeUndefined();
		store.setState(() => 99);
		expect(sig()).toBeUndefined();
	});

	it("rebinds when getStore resolves to a different instance", () => {
		const storeA = createStore(10);
		const storeB = createStore(200);
		let active: typeof storeA = storeA;
		const sig = useSelectorSignal(() => active);

		host.render();
		expect(sig()).toBe(10);

		active = storeB;
		host.render();
		expect(sig()).toBe(200);

		storeA.setState(() => 1);
		expect(sig()).toBe(200);

		storeB.setState(() => 201);
		expect(sig()).toBe(201);
	});

	it("compare suppresses redundant signal updates (maps to stencil equals)", () => {
		const store = createStore(1);
		const sig = useSelectorSignal(() => store, undefined, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		expect(sig()).toBe(1);
		store.setState(() => 3);
		expect(sig()).toBe(1);

		store.setState(() => 10);
		expect(sig()).toBe(10);
	});

	it("selector slice uses compare on projected values", () => {
		const store = createStore({ count: 0, noise: 0 });
		const sig = useSelectorSignal(
			() => store,
			s => s.count,
			{ compare: (a, b) => a === b },
		);
		host.render();

		store.setState(prev => ({ ...prev, noise: 1 }));
		expect(sig()).toBe(0);

		store.setState(prev => ({ ...prev, count: 1 }));
		expect(sig()).toBe(1);
	});
});
