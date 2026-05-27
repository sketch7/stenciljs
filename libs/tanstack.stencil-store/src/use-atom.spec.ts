import { TestHost, mount } from "@ssv/stencil-core/testing";
import { createAtom } from "@tanstack/store";
import { describe, expect, it } from "vitest";

import { useAtom } from "./use-atom";

describe("useAtom", () => {
	it("reads the current atom value after render", async () => {
		const atom = createAtom(42);
		using m = await mount(() => ({ state: useAtom(() => atom) }));
		expect(m.state.value).toBe(42);
	});

	it("set(value) updates the atom", async () => {
		const atom = createAtom(0);
		using m = await mount(() => ({ state: useAtom(() => atom) }));

		m.state.set(99);

		expect(atom.get()).toBe(99);
	});

	it("set(updater) applies updater function", async () => {
		const atom = createAtom(10);
		using m = await mount(() => ({ state: useAtom(() => atom) }));

		m.state.set(prev => prev + 5);

		expect(atom.get()).toBe(15);
	});

	it("triggers re-render when atom value changes via set()", async () => {
		const atom = createAtom(0);
		using m = await mount(() => ({ state: useAtom(() => atom) }));

		m.state.set(1);

		expect(m.renderCount).toBe(1);
		expect(m.state.value).toBe(1);
	});

	it("does not trigger re-render when set() value is unchanged", async () => {
		const atom = createAtom(5);
		const atom2 = createAtom(5);
		using m = await mount(() => {
			useAtom(() => atom);
			// setState with same value — @tanstack/store won't notify subscribers
			// because the store's equality check prevents notification
			return { state2: useAtom(() => atom2) };
		});

		atom2.set(5);

		expect(m.renderCount).toBe(0);
		expect(m.state2.value).toBe(5);
	});

	it("does not trigger re-render after disconnect", async () => {
		const atom = createAtom(0);
		using m = await mount(() => {
			useAtom(() => atom);
		});
		m.disconnect();

		atom.set(99);

		expect(m.renderCount).toBe(0);
	});

	it("value reflects latest set() after re-render", async () => {
		const atom = createAtom(0);
		using m = await mount(() => ({ state: useAtom(() => atom) }));

		m.state.set(7);
		m.state.set(14);

		expect(m.state.value).toBe(14);
		expect(m.renderCount).toBe(2);
	});

	it("respects custom compare option — no re-render when within threshold", async () => {
		const atom = createAtom(1);
		using m = await mount(() => {
			useAtom(() => atom, {
				compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
			});
		});

		// diff 2 < 5
		atom.set(3);

		expect(m.renderCount).toBe(0);
	});

	it("respects custom compare option — re-renders when outside threshold", async () => {
		const atom = createAtom(1);
		using m = await mount(() => ({
			state: useAtom(() => atom, {
				compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
			}),
		}));

		// diff 9 >= 5
		atom.set(10);

		expect(m.renderCount).toBe(1);
		expect(m.state.value).toBe(10);
	});

	it("value is accessible via a getter on a host subclass (component pattern)", async () => {
		const atom = createAtom(0);

		class ComponentLike extends TestHost {
			readonly count = useAtom(() => atom);

			increment() {
				this.count.set(prev => prev + 1);
			}
		}

		using component = await mount(() => {}, { hostFactory: () => new ComponentLike() });
		expect(component.count.value).toBe(0);

		component.increment();

		expect(component.renderCount).toBe(1);
		expect(component.count.value).toBe(1);
	});
});
