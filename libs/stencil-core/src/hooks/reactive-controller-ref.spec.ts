import { describe, it, expect, vi } from "vitest";

import type { ReactiveController } from "./reactive-controller";
import { reactiveController } from "./reactive-controller-ref";

describe("reactiveController", () => {
	describe("add / remove", () => {
		it("registers a controller", () => {
			const ref = reactiveController();
			const ctrl: ReactiveController = {};
			ref.add(ctrl);
			expect(ref.controllers.has(ctrl)).toBeTruthy();
		});

		it("unregisters a controller", () => {
			const ref = reactiveController();
			const ctrl: ReactiveController = {};
			ref.add(ctrl);
			ref.remove(ctrl);
			expect(ref.controllers.has(ctrl)).toBeFalsy();
		});

		it("registers multiple controllers", () => {
			const ref = reactiveController();
			ref.add({});
			ref.add({});
			expect(ref.controllers.size).toBe(2);
		});

		it("does not register the same controller twice", () => {
			const ref = reactiveController();
			const ctrl: ReactiveController = { hostConnected: vi.fn<() => void>() };
			ref.add(ctrl);
			ref.add(ctrl);
			expect(ref.controllers.size).toBe(1);
			ref.connected();
			expect(ctrl.hostConnected).toHaveBeenCalledOnce();
		});

		it("removing an unregistered controller is a no-op", () => {
			const ref = reactiveController();
			expect(() => ref.remove({})).not.toThrow();
		});
	});

	describe("sync lifecycle dispatch", () => {
		it.each([
			["connected", "hostConnected"],
			["disconnected", "hostDisconnected"],
			["didLoad", "hostDidLoad"],
			["didRender", "hostDidRender"],
			["didUpdate", "hostDidUpdate"],
		] as const)("%s → %s on each controller", (method, hook) => {
			const ref = reactiveController();
			const ctrl = { [hook]: vi.fn<() => void>() } as ReactiveController;
			ref.add(ctrl);
			ref[method]();
			expect(ctrl[hook]).toHaveBeenCalledOnce();
		});

		it("dispatches to every registered controller", () => {
			const ref = reactiveController();
			const a: ReactiveController = { hostConnected: vi.fn<() => void>() };
			const b: ReactiveController = { hostConnected: vi.fn<() => void>() };
			ref.add(a);
			ref.add(b);
			ref.connected();
			expect(a.hostConnected).toHaveBeenCalledOnce();
			expect(b.hostConnected).toHaveBeenCalledOnce();
		});

		it("does not dispatch to removed controllers", () => {
			const ref = reactiveController();
			const ctrl: ReactiveController = { hostConnected: vi.fn<() => void>() };
			ref.add(ctrl);
			ref.remove(ctrl);
			ref.connected();
			expect(ctrl.hostConnected).not.toHaveBeenCalled();
		});
	});

	describe("async lifecycle dispatch", () => {
		it.each(["willLoad", "willRender", "willUpdate"] as const)(
			"%s returns undefined when no async work is pending",
			method => {
				const ref = reactiveController();
				ref.add({});
				expect(ref[method]()).toBeUndefined();
			},
		);

		it("awaits a single async hostWillLoad", async () => {
			const ref = reactiveController();
			const order: string[] = [];
			ref.add({
				hostWillLoad: async () => {
					await new Promise(resolve => {
						setTimeout(resolve, 0);
					});
					order.push("loaded");
				},
			});
			await ref.willLoad();
			order.push("after");
			expect(order).toStrictEqual(["loaded", "after"]);
		});

		it("awaits multiple async hostWillLoad hooks in parallel", async () => {
			const ref = reactiveController();
			const resolved: string[] = [];
			ref.add({
				hostWillLoad: async () => {
					resolved.push("a");
				},
			});
			ref.add({
				hostWillLoad: async () => {
					resolved.push("b");
				},
			});
			await ref.willLoad();
			expect(resolved).toContain("a");
			expect(resolved).toContain("b");
		});

		it("returns a promise only when a controller returns one", () => {
			const ref = reactiveController();
			ref.add({ hostWillRender: vi.fn<() => void>() });
			expect(ref.willRender()).toBeUndefined();

			ref.add({ hostWillRender: async () => Promise.resolve() });
			expect(ref.willRender()).toBeInstanceOf(Promise);
		});
	});

	describe("partial controllers", () => {
		it("does not throw when a controller implements no hooks", () => {
			const ref = reactiveController();
			ref.add({});
			expect(() => {
				ref.connected();
				ref.disconnected();
				void ref.willLoad();
				ref.didLoad();
				void ref.willRender();
				ref.didRender();
				void ref.willUpdate();
				ref.didUpdate();
			}).not.toThrow();
		});

		it("only invokes the hooks a controller implements", () => {
			const ref = reactiveController();
			const connected = vi.fn<() => void>();
			const disconnected = vi.fn<() => void>();
			ref.add({ hostConnected: connected });
			ref.add({ hostDisconnected: disconnected });

			ref.connected();
			expect(connected).toHaveBeenCalledOnce();
			expect(disconnected).not.toHaveBeenCalled();

			ref.disconnected();
			expect(disconnected).toHaveBeenCalledOnce();
		});
	});
});
