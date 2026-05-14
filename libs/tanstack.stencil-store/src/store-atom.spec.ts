import { clearCurrentHost, TestHost } from "@ssv/stencil.core/testing";
import { createAtom } from "@tanstack/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAtom } from "./store-atom";

describe("useAtom", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		clearCurrentHost();
	});

	it("reads the current atom value after render", () => {
		const atom = createAtom(42);
		const state = useAtom(() => atom);
		host.render();
		expect(state.value).toBe(42);
	});

	it("set(value) updates the atom", () => {
		const atom = createAtom(0);
		const state = useAtom(() => atom);
		host.render();

		state.set(99);

		expect(atom.get()).toBe(99);
	});

	it("set(updater) applies updater function", () => {
		const atom = createAtom(10);
		const state = useAtom(() => atom);
		host.render();

		state.set(prev => prev + 5);

		expect(atom.get()).toBe(15);
	});

	it("triggers re-render when atom value changes via set()", () => {
		const atom = createAtom(0);
		const state = useAtom(() => atom);
		host.render();

		state.set(1);

		expect(host.renderCount).toBe(1);
		expect(state.value).toBe(1);
	});

	it("does not trigger re-render when set() value is unchanged", () => {
		const atom = createAtom(5);
		useAtom(() => atom);
		host.render();

		// setState with same value — @tanstack/store won't notify subscribers
		// because the store's equality check prevents notification
		const atom2 = createAtom(5);
		const state2 = useAtom(() => atom2);
		host.render();

		atom2.set(5);

		expect(host.renderCount).toBe(0);
		expect(state2.value).toBe(5);
	});

	it("does not trigger re-render after disconnect", () => {
		const atom = createAtom(0);
		useAtom(() => atom);
		host.render();
		host.disconnect();

		atom.set(99);

		expect(host.renderCount).toBe(0);
	});

	it("value reflects latest set() after re-render", () => {
		const atom = createAtom(0);
		const state = useAtom(() => atom);
		host.render();

		state.set(7);
		state.set(14);

		expect(state.value).toBe(14);
		expect(host.renderCount).toBe(2);
	});

	it("respects custom compare option — no re-render when within threshold", () => {
		const atom = createAtom(1);
		useAtom(() => atom, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		// diff 2 < 5
		atom.set(3);

		expect(host.renderCount).toBe(0);
	});

	it("respects custom compare option — re-renders when outside threshold", () => {
		const atom = createAtom(1);
		const state = useAtom(() => atom, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		// diff 9 >= 5
		atom.set(10);

		expect(host.renderCount).toBe(1);
		expect(state.value).toBe(10);
	});

	it("value is accessible via a getter on a host subclass (component pattern)", () => {
		const atom = createAtom(0);

		class ComponentLike extends TestHost {
			readonly count = useAtom(() => atom);

			increment() {
				this.count.set(prev => prev + 1);
			}
		}

		const component = new ComponentLike();
		component.render();

		expect(component.count.value).toBe(0);

		component.increment();

		expect(component.renderCount).toBe(1);
		expect(component.count.value).toBe(1);
	});
});
