import { describe, expect, it, vi } from "vitest";

import { createWritableRef } from "../ref";
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
			return () => {
				order.push("cleanup");
			};
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
			return () => {
				order.push("cleanup");
			};
		}, []);
		host.connect();
		host.disconnect();
		host.connect();
		expect(order).toStrictEqual(["setup", "cleanup", "setup"]);
	});
});

// ── useEffect — reactive deps (re-run on dep change via hostDidRender) ────────

describe("useEffect — reactive deps", () => {
	it("registers exactly one controller with the host", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		useEffect(vi.fn(), [myRef]);
		expect(host.controllers.size).toBe(1);
	});

	it("setup does NOT run before hostConnected", () => {
		using _host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		expect(setup).not.toHaveBeenCalled();
	});

	it("setup runs on hostConnected when all deps are defined", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		host.connect();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("setup is skipped at hostConnected when a dep is null", () => {
		using host = new TestHost();
		const emptyRef = createWritableRef<number>();
		const setup = vi.fn<() => void>();
		useEffect(setup, [emptyRef]);
		host.connect();
		expect(setup).not.toHaveBeenCalled();
	});

	it("deferred setup runs on first hostDidRender when dep resolves", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>();
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		host.connect();
		myRef.current = 42;
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("does not re-run when dep value is unchanged", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		host.connect();
		host.render();
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("re-runs setup when a dep changes at hostDidRender", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		host.connect();
		myRef.current = 2;
		host.render();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("calls cleanup before re-running setup on dep change", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const cleanup = vi.fn<() => void>();
		useEffect(() => cleanup, [myRef]);
		host.connect();
		myRef.current = 2;
		host.render();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("re-run receives updated dep value", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const captured: number[] = [];
		useEffect(() => {
			captured.push(myRef.current);
		}, [myRef]);
		host.connect();
		myRef.current = 42;
		host.render();
		expect(captured).toStrictEqual([1, 42]);
	});

	it("pauses effect (cleanup, no re-run) when dep becomes null", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number | null>(1);
		const cleanup = vi.fn<() => void>();
		let setupCallCount = 0;
		useEffect(() => {
			setupCallCount++;
			return cleanup;
		}, [myRef]);
		host.connect();
		myRef.current = null;
		host.render();
		expect(cleanup).toHaveBeenCalledOnce();
		host.render();
		expect(setupCallCount).toBe(1); // still only once — paused
	});

	it("resumes effect when dep becomes non-null after being null", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number | null>(1);
		const setup = vi.fn<() => void>();
		useEffect(setup, [myRef]);
		host.connect();
		myRef.current = null;
		host.render();
		myRef.current = 42;
		host.render();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("cleanup runs on hostDisconnected", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const cleanup = vi.fn<() => void>();
		useEffect(() => cleanup, [myRef]);
		host.connect();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("accepts getter functions as deps", () => {
		using host = new TestHost();
		let signalVal = 1;
		const setup = vi.fn<() => void>();
		useEffect(setup, [() => signalVal]);
		host.connect();
		signalVal = 2;
		host.render();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("supports multiple deps — re-runs when any changes", () => {
		using host = new TestHost();
		const aRef = createWritableRef<number>(1);
		const bRef = createWritableRef<string>("x");
		const setup = vi.fn<() => void>();
		useEffect(setup, [aRef, bRef]);
		host.connect();
		bRef.current = "y";
		host.render();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("disconnect then reconnect: cleanup fires then setup fires again", () => {
		using host = new TestHost();
		const myRef = createWritableRef<number>(1);
		const order: string[] = [];
		useEffect(() => {
			order.push("setup");
			return () => {
				order.push("cleanup");
			};
		}, [myRef]);
		host.connect();
		host.disconnect();
		host.connect();
		expect(order).toStrictEqual(["setup", "cleanup", "setup"]);
	});

	it("[] still behaves as mount-only", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useEffect(setup, []);
		host.connect();
		host.render();
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});
});
