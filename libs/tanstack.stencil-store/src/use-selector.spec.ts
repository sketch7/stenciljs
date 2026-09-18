import { TestHost, mount } from "@ssv/stencil-core/testing";
import { createStore } from "@tanstack/store";
import { describe, expect, it } from "vitest";

import { useSelector } from "./use-selector";

describe("useSelector", () => {
	it("registers itself with the host on construction", async () => {
		const store = createStore(0);
		using host = await mount(() => {
			useSelector(() => store);
		});
		expect(host.controllers.size).toBe(1);
	});

	it("returns undefined before first render", async () => {
		const store = createStore(42);
		using _m = await mount(() => ({ getValue: useSelector(() => store) }), {
			afterConnect: mounted => expect(mounted.getValue()).toBeUndefined(),
		});
	});

	it("reads current store value after first render", async () => {
		const store = createStore(42);
		using m = await mount(() => ({ getValue: useSelector(() => store) }));
		expect(m.getValue()).toBe(42);
	});

	it("updates value and re-renders when store changes", async () => {
		const store = createStore(0);
		using m = await mount(() => ({ getValue: useSelector(() => store) }));

		store.setState(() => 42);

		expect(m.renderCount).toBe(1);
		expect(m.getValue()).toBe(42);
	});

	it("does not re-render when store value is unchanged", async () => {
		const store = createStore(0);
		using m = await mount(() => {
			useSelector(() => store);
		});

		store.setState(() => 0);

		expect(m.renderCount).toBe(0);
	});

	it("selector suppresses re-render when selected value is unchanged", async () => {
		const store = createStore({ count: 0, ignored: 0 });
		using m = await mount(() => ({
			getCount: useSelector(
				() => store,
				s => s.count,
			),
		}));

		store.setState(prev => ({ ...prev, ignored: prev.ignored + 1 }));

		expect(m.renderCount).toBe(0);
		expect(m.getCount()).toBe(0);
	});

	it("selector triggers re-render when selected value changes", async () => {
		const store = createStore({ count: 0, ignored: 0 });
		using m = await mount(() => ({
			getCount: useSelector(
				() => store,
				s => s.count,
			),
		}));

		store.setState(prev => ({ ...prev, count: prev.count + 1 }));

		expect(m.renderCount).toBe(1);
		expect(m.getCount()).toBe(1);
	});

	it("selector returns updated value on re-render", async () => {
		const store = createStore({ count: 0, ignored: 0 });
		using m = await mount(() => ({
			getCount: useSelector(
				() => store,
				s => s.count,
			),
		}));

		store.setState(prev => ({ ...prev, count: 5 }));
		store.setState(prev => ({ ...prev, ignored: 99 }));

		expect(m.renderCount).toBe(1);
		expect(m.getCount()).toBe(5);
	});

	it("does not re-render after hostDisconnected", async () => {
		const store = createStore(0);
		using m = await mount(() => {
			useSelector(() => store);
		});
		m.disconnect();

		store.setState(() => 1);

		expect(m.renderCount).toBe(0);
	});

	it("clears value after hostDisconnected", async () => {
		const store = createStore(42);
		using m = await mount(() => ({ getValue: useSelector(() => store) }));
		m.disconnect();

		expect(m.getValue()).toBeUndefined();
	});

	it("respects custom compare function — no re-render when within threshold", async () => {
		const store = createStore(1);
		using m = await mount(() => {
			useSelector(() => store, undefined, {
				compare: (a, b) => Math.abs(a! - b!) < 5,
			});
		});

		// diff 2 < 5
		store.setState(() => 3);

		expect(m.renderCount).toBe(0);
	});

	it("respects custom compare function — re-renders when outside threshold", async () => {
		const store = createStore(1);
		using m = await mount(() => ({
			getValue: useSelector(() => store, undefined, {
				compare: (a, b) => Math.abs(a! - b!) < 5,
			}),
		}));

		// diff 9 >= 5
		store.setState(() => 10);

		expect(m.renderCount).toBe(1);
		expect(m.getValue()).toBe(10);
	});

	it("value is accessible directly in a component subclass (component pattern)", async () => {
		const store = createStore({ count: 0, ignored: 0 });

		class ComponentLike extends TestHost {
			readonly count = useSelector(
				() => store,
				s => s.count,
			);
		}

		using component = await mount(() => {}, { hostFactory: () => new ComponentLike() });

		expect(component.count()).toBe(0);

		store.setState(prev => ({ ...prev, count: 5 }));

		expect(component.renderCount).toBe(1);
		expect(component.count()).toBe(5);
	});

	it("returns undefined before first render, value after (component pattern)", async () => {
		const store = createStore(42);

		class ComponentLike extends TestHost {
			readonly count = useSelector(() => store);
		}

		using component = await mount(() => {}, {
			hostFactory: () => new ComponentLike(),
			afterConnect: host => expect(host.count()).toBeUndefined(),
		});

		expect(component.count()).toBe(42);
	});
});
