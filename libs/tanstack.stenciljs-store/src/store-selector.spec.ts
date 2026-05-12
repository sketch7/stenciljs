import type { ReactiveController, ReactiveControllerHost } from "@ssv/stenciljs.core";
import { createStore } from "@tanstack/store";
import { describe, expect, it, beforeEach } from "vitest";

import { createSelectorCtrl, StoreSelector } from "./store-selector.js";

function createMockHost(): ReactiveControllerHost & {
	controllers: Set<ReactiveController>;
	requestUpdateCount: number;
} {
	const controllers = new Set<ReactiveController>();
	return {
		controllers,
		requestUpdateCount: 0,
		addController(ctrl) {
			controllers.add(ctrl);
		},
		removeController(ctrl) {
			controllers.delete(ctrl);
		},
		requestUpdate() {
			(this as { requestUpdateCount: number }).requestUpdateCount++;
		},
	};
}

describe("StoreSelector", () => {
	let host: ReturnType<typeof createMockHost>;

	beforeEach(() => {
		host = createMockHost();
	});

	it("registers itself with the host on construction", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);
		expect(host.controllers.has(ctrl)).toBeTruthy();
	});

	it("subscribes on first hostWillRender()", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);

		ctrl.hostWillRender();
		store.setState(() => 1);

		expect(host.requestUpdateCount).toBe(1);
	});

	it("calls requestUpdate() when store value changes", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);
		ctrl.hostWillRender();

		store.setState(() => 42);

		expect(host.requestUpdateCount).toBe(1);
	});

	it("does not call requestUpdate() when value is unchanged", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);
		ctrl.hostWillRender();

		store.setState(() => 0);

		expect(host.requestUpdateCount).toBe(0);
	});

	it("selector suppresses requestUpdate when selected value is unchanged", () => {
		const store = createStore({ count: 0, ignored: 0 });
		const ctrl = createSelectorCtrl(
			host,
			() => store,
			s => s.count,
		);
		ctrl.hostWillRender();

		store.setState(prev => ({ ...prev, ignored: prev.ignored + 1 }));

		expect(host.requestUpdateCount).toBe(0);
	});

	it("selector triggers requestUpdate when selected value changes", () => {
		const store = createStore({ count: 0, ignored: 0 });
		const ctrl = createSelectorCtrl(
			host,
			() => store,
			s => s.count,
		);
		ctrl.hostWillRender();

		store.setState(prev => ({ ...prev, count: prev.count + 1 }));

		expect(host.requestUpdateCount).toBe(1);
	});

	it("re-subscribes when store reference changes on next hostWillRender()", () => {
		const store1 = createStore(10);
		const store2 = createStore(20);
		let current = store1;

		const ctrl = createSelectorCtrl(host, () => current);
		ctrl.hostWillRender();

		// switch store reference
		current = store2;
		ctrl.hostWillRender();

		// update on old store should not trigger
		store1.setState(() => 99);
		expect(host.requestUpdateCount).toBe(0);

		// update on new store should trigger
		store2.setState(() => 30);
		expect(host.requestUpdateCount).toBe(1);
	});

	it("unsubscribes on hostDisconnected()", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);
		ctrl.hostWillRender();
		ctrl.hostDisconnected();

		store.setState(() => 1);

		expect(host.requestUpdateCount).toBe(0);
	});

	it("handles undefined store gracefully", () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		const ctrl = createSelectorCtrl(host, () => undefined);
		expect(() => ctrl.hostWillRender()).not.toThrow();
		expect(() => ctrl.hostDisconnected()).not.toThrow();
	});

	it("respects custom compare function", () => {
		const store = createStore(1);
		const ctrl = createSelectorCtrl(host, () => store, undefined, {
			compare: (a, b) => Math.abs(a - b) < 5,
		});
		ctrl.hostWillRender();

		store.setState(() => 3);
		// diff < 5, no update
		expect(host.requestUpdateCount).toBe(0);

		store.setState(() => 10);
		// diff >= 5 from 3, triggers update
		expect(host.requestUpdateCount).toBe(1);
	});

	it("createSelectorCtrl returns a StoreSelector instance", () => {
		const store = createStore(0);
		const ctrl = createSelectorCtrl(host, () => store);
		expect(ctrl).toBeInstanceOf(StoreSelector);
	});
});
