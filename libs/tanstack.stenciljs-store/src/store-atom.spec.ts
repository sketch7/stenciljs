import type { ReactiveController, ReactiveControllerHost } from "@ssv/stenciljs.core";
import { createAtom } from "@tanstack/store";
import { describe, expect, it, beforeEach } from "vitest";

import { createAtomCtrl } from "./store-atom.js";

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

/** Simulate the host calling hostWillRender on all registered controllers. */
function triggerWillRender(host: { controllers: Set<ReactiveController> }) {
	for (const c of host.controllers) {
		c.hostWillRender?.();
	}
}

/** Simulate the host calling hostDisconnected on all registered controllers. */
function triggerDisconnected(host: { controllers: Set<ReactiveController> }) {
	for (const c of host.controllers) {
		c.hostDisconnected?.();
	}
}

describe("createAtomCtrl", () => {
	let host: ReturnType<typeof createMockHost>;

	beforeEach(() => {
		host = createMockHost();
	});

	it("reads the current atom value", () => {
		const atom = createAtom(42);
		const ctrl = createAtomCtrl(host, () => atom);

		expect(ctrl.value).toBe(42);
	});

	it("returns undefined when atom getter returns undefined", () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		const ctrl = createAtomCtrl<number>(host, () => undefined);
		expect(ctrl.value).toBeUndefined();
	});

	it("set(value) updates the atom", () => {
		const atom = createAtom(0);
		const ctrl = createAtomCtrl(host, () => atom);
		triggerWillRender(host);

		ctrl.set(99);

		expect(atom.get()).toBe(99);
	});

	it("set(updater) applies updater function", () => {
		const atom = createAtom(10);
		const ctrl = createAtomCtrl(host, () => atom);
		triggerWillRender(host);

		ctrl.set(prev => prev + 5);

		expect(atom.get()).toBe(15);
	});

	it("triggers requestUpdate when atom value changes via set()", () => {
		const atom = createAtom(0);
		const ctrl = createAtomCtrl(host, () => atom);
		triggerWillRender(host);

		ctrl.set(1);

		expect(host.requestUpdateCount).toBe(1);
	});

	it("does not trigger requestUpdate when set() value is unchanged", () => {
		const atom = createAtom(5);
		const ctrl = createAtomCtrl(host, () => atom);
		triggerWillRender(host);

		ctrl.set(5);

		expect(host.requestUpdateCount).toBe(0);
	});

	it("set() is a no-op when atom getter returns undefined", () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		const ctrl = createAtomCtrl<number>(host, () => undefined);
		expect(() => ctrl.set(1)).not.toThrow();
	});

	it("respects custom compare option", () => {
		const atom = createAtom(1);
		const ctrl = createAtomCtrl(host, () => atom, {
			compare: (a, b) => Math.abs(a - b) < 5,
		});
		triggerWillRender(host);

		ctrl.set(3);
		// diff < 5 → no update
		expect(host.requestUpdateCount).toBe(0);

		ctrl.set(10);
		// diff >= 5 → update
		expect(host.requestUpdateCount).toBe(1);
	});

	it("unsubscribes on hostDisconnected", () => {
		const atom = createAtom(0);
		const ctrl = createAtomCtrl(host, () => atom);
		triggerWillRender(host);
		triggerDisconnected(host);

		ctrl.set(99);

		expect(host.requestUpdateCount).toBe(0);
	});
});
