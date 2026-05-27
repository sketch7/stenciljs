import { describe, expect, it, vi } from "vitest";

import { TestHost } from "../testing/test-host";
import { useEffect } from "./use-effect";

// ── useEffect — no deps (every render via hostDidRender) ──────────────────────

describe("useEffect — no deps", () => {
	it("registers exactly one controller with the host", () => {
		using host = new TestHost();
		useEffect(vi.fn());
		expect(host.controllers.size).toBe(1);
	});

	it("setup does NOT run before hostDidRender", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup);
		host.connect();
		expect(setup).not.toHaveBeenCalled();
	});

	it("setup runs on first hostDidRender", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup);
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("cleanup from previous render runs before next render setup", () => {
		using host = new TestHost();
		const order: string[] = [];
		useEffect(() => {
			order.push("setup");
			return () => order.push("cleanup");
		});
		host.render();
		host.render();
		expect(order).toStrictEqual(["setup", "cleanup", "setup"]);
	});

	it("cleanup is NOT called when setup returns void", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup);
		host.render();
		host.render();
		host.disconnect();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("cleanup runs on hostDisconnected", () => {
		using host = new TestHost();
		const cleanup = vi.fn<() => void>();
		useEffect(() => cleanup);
		host.render();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("cleanup does NOT run on disconnect if hostDidRender was never called", () => {
		using host = new TestHost();
		const cleanup = vi.fn<() => void>();
		useEffect(() => cleanup);
		host.disconnect();
		expect(cleanup).not.toHaveBeenCalled();
	});

	it("registers one controller per useEffect call", () => {
		using host = new TestHost();
		useEffect(vi.fn());
		useEffect(vi.fn());
		expect(host.controllers.size).toBe(2);
	});

	it("multiple useEffect callbacks each run independently on render", () => {
		using host = new TestHost();
		const setupA = vi.fn<() => void>();
		const setupB = vi.fn<() => void>();
		useEffect(setupA);
		useEffect(setupB);
		host.render();
		expect(setupA).toHaveBeenCalledOnce();
		expect(setupB).toHaveBeenCalledOnce();
	});
});

// ── useEffect — empty deps [] (mount-only via hostConnected) ──────────────────

describe("useEffect — [] deps (mount-only)", () => {
	it("registers exactly one controller with the host", () => {
		using host = new TestHost();
		useEffect(vi.fn(), []);
		expect(host.controllers.size).toBe(1);
	});

	it("setup does NOT run before hostConnected", () => {
		using _host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup, []);
		expect(setup).not.toHaveBeenCalled();
	});

	it("setup runs on hostConnected", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup, []);
		host.connect();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("setup does NOT re-run on subsequent renders", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup, []);
		host.connect();
		host.render();
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("cleanup runs on hostDisconnected", () => {
		using host = new TestHost();
		const cleanup = vi.fn<() => void>();
		useEffect(() => cleanup, []);
		host.connect();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("cleanup is NOT called when setup returns void", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup, []);
		host.connect();
		host.disconnect();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("disconnect then reconnect: cleanup fires then setup fires again", () => {
		using host = new TestHost();
		const order: string[] = [];
		useEffect(() => {
			order.push("setup");
			return () => order.push("cleanup");
		}, []);
		host.connect();
		host.disconnect();
		host.connect();
		expect(order).toStrictEqual(["setup", "cleanup", "setup"]);
	});
});
