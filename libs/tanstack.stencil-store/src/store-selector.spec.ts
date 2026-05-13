import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";
import { createStore } from "@tanstack/store";
import { describe, expect, it, beforeEach } from "vitest";

import { useSelector, StoreSelector } from "./store-selector";

class TestHost implements ReactiveControllerHost {
	readonly controllers = new Set<ReactiveController>();
	renderCount = 0;

	addController(ctrl: ReactiveController): void {
		this.controllers.add(ctrl);
	}

	removeController(ctrl: ReactiveController): void {
		this.controllers.delete(ctrl);
	}

	/** Simulates Stencil calling componentWillRender → hostWillRender on each controller. */
	render(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostWillRender?.();
		}
	}

	/**
	 * Simulates Stencil scheduling and executing a re-render after forceUpdate().
	 * Increments renderCount then runs the full render cycle.
	 */
	requestUpdate(): void {
		this.renderCount++;
		this.render();
	}

	/** Simulates Stencil calling disconnectedCallback → hostDisconnected. */
	disconnect(): void {
		for (const ctrl of this.controllers) {
			ctrl.hostDisconnected?.();
		}
	}
}

describe("useSelector", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	it("registers itself with the host on construction", () => {
		const store = createStore(0);
		const ctrl = useSelector(host, () => store);
		expect(host.controllers.has(ctrl)).toBeTruthy();
	});

	it("returns undefined before first render", () => {
		const store = createStore(42);
		const ctrl = useSelector(host, () => store);
		expect(ctrl.value).toBeUndefined();
	});

	it("reads current store value after first render", () => {
		const store = createStore(42);
		const ctrl = useSelector(host, () => store);
		host.render();
		expect(ctrl.value).toBe(42);
	});

	it("updates value and re-renders when store changes", () => {
		const store = createStore(0);
		const ctrl = useSelector(host, () => store);
		host.render();

		store.setState(() => 42);

		expect(host.renderCount).toBe(1);
		expect(ctrl.value).toBe(42);
	});

	it("does not re-render when store value is unchanged", () => {
		const store = createStore(0);
		useSelector(host, () => store);
		host.render();

		store.setState(() => 0);

		expect(host.renderCount).toBe(0);
	});

	it("selector suppresses re-render when selected value is unchanged", () => {
		const store = createStore({ count: 0, ignored: 0 });
		const ctrl = useSelector(
			host,
			() => store,
			s => s.count,
		);
		host.render();

		store.setState(prev => ({ ...prev, ignored: prev.ignored + 1 }));

		expect(host.renderCount).toBe(0);
		expect(ctrl.value).toBe(0);
	});

	it("selector triggers re-render when selected value changes", () => {
		const store = createStore({ count: 0, ignored: 0 });
		const ctrl = useSelector(
			host,
			() => store,
			s => s.count,
		);
		host.render();

		store.setState(prev => ({ ...prev, count: prev.count + 1 }));

		expect(host.renderCount).toBe(1);
		expect(ctrl.value).toBe(1);
	});

	it("selector returns updated value on re-render", () => {
		const store = createStore({ count: 0, ignored: 0 });
		const ctrl = useSelector(
			host,
			() => store,
			s => s.count,
		);
		host.render();

		store.setState(prev => ({ ...prev, count: 5 }));
		store.setState(prev => ({ ...prev, ignored: 99 }));

		expect(host.renderCount).toBe(1);
		expect(ctrl.value).toBe(5);
	});

	it("does not re-render after hostDisconnected", () => {
		const store = createStore(0);
		useSelector(host, () => store);
		host.render();
		host.disconnect();

		store.setState(() => 1);

		expect(host.renderCount).toBe(0);
	});

	it("clears value after hostDisconnected", () => {
		const store = createStore(42);
		const ctrl = useSelector(host, () => store);
		host.render();
		host.disconnect();

		expect(ctrl.value).toBeUndefined();
	});

	it("respects custom compare function — no re-render when within threshold", () => {
		const store = createStore(1);
		useSelector(host, () => store, undefined, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		// diff 2 < 5
		store.setState(() => 3);

		expect(host.renderCount).toBe(0);
	});

	it("respects custom compare function — re-renders when outside threshold", () => {
		const store = createStore(1);
		const ctrl = useSelector(host, () => store, undefined, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		// diff 9 >= 5
		store.setState(() => 10);

		expect(host.renderCount).toBe(1);
		expect(ctrl.value).toBe(10);
	});

	it("useSelector returns a StoreSelector instance", () => {
		const store = createStore(0);
		const ctrl = useSelector(host, () => store);
		expect(ctrl).toBeInstanceOf(StoreSelector);
	});
});
