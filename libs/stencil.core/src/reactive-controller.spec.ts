import { forceUpdate } from "@stencil/core";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ReactiveControllerHostMixin } from "./reactive-controller";
import type { ReactiveController } from "./reactive-controller";

// Mock @stencil/core before importing the module under test
vi.mock(import("@stencil/core"), () => ({
	forceUpdate: vi.fn<() => void>(),
}));

// Create a concrete host class by applying the mixin to a base class
class BaseClass {}
const ReactiveControllerHostClass = ReactiveControllerHostMixin(BaseClass as any);

describe("ReactiveControllerHostMixin", () => {
	let host: InstanceType<typeof ReactiveControllerHostClass>;

	beforeEach(() => {
		vi.clearAllMocks();
		host = new ReactiveControllerHostClass();
	});

	describe("addController / removeController", () => {
		it("adds a controller", () => {
			const ctrl: ReactiveController = {};
			host.addController(ctrl);
			expect(host.controllers.has(ctrl)).toBeTruthy();
		});

		it("removes a controller", () => {
			const ctrl: ReactiveController = {};
			host.addController(ctrl);
			host.removeController(ctrl);
			expect(host.controllers.has(ctrl)).toBeFalsy();
		});

		it("can add multiple controllers", () => {
			const ctrl1: ReactiveController = {};
			const ctrl2: ReactiveController = {};
			host.addController(ctrl1);
			host.addController(ctrl2);
			expect(host.controllers.size).toBe(2);
		});
	});

	describe("requestUpdate", () => {
		it("calls forceUpdate with the host instance", () => {
			host.requestUpdate();
			expect(forceUpdate).toHaveBeenCalledWith(host);
		});
	});

	describe("lifecycle delegation", () => {
		let ctrl: Required<ReactiveController>;

		beforeEach(() => {
			ctrl = {
				hostConnected: vi.fn<() => void>(),
				hostDisconnected: vi.fn<() => void>(),
				hostWillLoad: vi.fn<() => Promise<void> | void>(),
				hostDidLoad: vi.fn<() => void>(),
				hostWillRender: vi.fn<() => Promise<void> | void>(),
				hostDidRender: vi.fn<() => void>(),
				hostWillUpdate: vi.fn<() => Promise<void> | void>(),
				hostDidUpdate: vi.fn<() => void>(),
			};
			host.addController(ctrl);
		});

		it("connectedCallback → hostConnected", () => {
			host.connectedCallback();
			expect(ctrl.hostConnected).toHaveBeenCalledOnce();
		});

		it("disconnectedCallback → hostDisconnected", () => {
			host.disconnectedCallback();
			expect(ctrl.hostDisconnected).toHaveBeenCalledOnce();
		});

		it("componentWillLoad → hostWillLoad", async () => {
			await host.componentWillLoad();
			expect(ctrl.hostWillLoad).toHaveBeenCalledOnce();
		});

		it("componentDidLoad → hostDidLoad", () => {
			host.componentDidLoad();
			expect(ctrl.hostDidLoad).toHaveBeenCalledOnce();
		});

		it("componentWillRender → hostWillRender", async () => {
			await host.componentWillRender();
			expect(ctrl.hostWillRender).toHaveBeenCalledOnce();
		});

		it("componentDidRender → hostDidRender", () => {
			host.componentDidRender();
			expect(ctrl.hostDidRender).toHaveBeenCalledOnce();
		});

		it("componentWillUpdate → hostWillUpdate", async () => {
			await host.componentWillUpdate();
			expect(ctrl.hostWillUpdate).toHaveBeenCalledOnce();
		});

		it("componentDidUpdate → hostDidUpdate", () => {
			host.componentDidUpdate();
			expect(ctrl.hostDidUpdate).toHaveBeenCalledOnce();
		});

		it("delegates lifecycle to all registered controllers", () => {
			const ctrl2: ReactiveController = { hostConnected: vi.fn<() => void>() };
			host.addController(ctrl2);
			host.connectedCallback();
			expect(ctrl.hostConnected).toHaveBeenCalledOnce();
			expect(ctrl2.hostConnected).toHaveBeenCalledOnce();
		});

		it("does not delegate to removed controllers", () => {
			host.removeController(ctrl);
			host.connectedCallback();
			expect(ctrl.hostConnected).not.toHaveBeenCalled();
		});
	});

	describe("partial controller implementation", () => {
		it("does not throw when controller has no hooks implemented", () => {
			const ctrl: ReactiveController = {};
			host.addController(ctrl);
			expect(() => host.connectedCallback()).not.toThrow();
			expect(() => host.disconnectedCallback()).not.toThrow();
			expect(() => host.componentWillLoad()).not.toThrow();
			expect(() => host.componentDidLoad()).not.toThrow();
			expect(() => host.componentWillRender()).not.toThrow();
			expect(() => host.componentDidRender()).not.toThrow();
			expect(() => host.componentWillUpdate()).not.toThrow();
			expect(() => host.componentDidUpdate()).not.toThrow();
		});
	});

	describe("async lifecycle hooks", () => {
		it("awaits async hostWillLoad from controller", async () => {
			const order: string[] = [];
			const ctrl: ReactiveController = {
				hostWillLoad: async () => {
					await new Promise(resolve => {
						setTimeout(resolve, 0);
					});
					order.push("loaded");
				},
			};
			host.addController(ctrl);
			await host.componentWillLoad();
			order.push("after");
			expect(order).toStrictEqual(["loaded", "after"]);
		});

		it("awaits multiple async hostWillLoad hooks in parallel", async () => {
			const resolved: string[] = [];
			const ctrl1: ReactiveController = {
				hostWillLoad: async () => {
					resolved.push("ctrl1");
				},
			};
			const ctrl2: ReactiveController = {
				hostWillLoad: async () => {
					resolved.push("ctrl2");
				},
			};
			host.addController(ctrl1);
			host.addController(ctrl2);
			await host.componentWillLoad();
			expect(resolved).toContain("ctrl1");
			expect(resolved).toContain("ctrl2");
		});
	});
});
