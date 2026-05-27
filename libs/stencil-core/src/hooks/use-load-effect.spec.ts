import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { createWritableRef } from "../ref";
import { TestHost } from "../testing";
import type { UseLoadEffectContext } from "./use-load-effect";
import { useLoadEffect } from "./use-load-effect";

// ── useLoadEffect ─────────────────────────────────────────────────────────────

describe("useLoadEffect", () => {
	it("registers exactly one controller with the host", () => {
		using host = new TestHost();
		useLoadEffect(vi.fn());
		expect(host.controllers.size).toBe(1);
	});

	it("setup does NOT run on hostConnected", () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useLoadEffect(setup);
		host.connect();
		expect(setup).not.toHaveBeenCalled();
	});

	it("setup runs on hostWillLoad", async () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useLoadEffect(setup);
		await host.willLoad();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("cleanup runs on hostDisconnected", async () => {
		using host = new TestHost();
		const cleanup = vi.fn<() => void>();
		useLoadEffect(() => cleanup);
		await host.willLoad();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("cleanup is NOT called when setup returns void", async () => {
		using host = new TestHost();
		const setup = vi.fn<() => void>();
		useLoadEffect(setup);
		await host.willLoad();
		host.disconnect();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("receives UseLoadEffectContext — host.requestUpdate is callable", async () => {
		using host = new TestHost();
		let capturedCtx: UseLoadEffectContext | undefined;
		useLoadEffect(ctx => {
			capturedCtx = ctx;
		});
		await host.willLoad();
		expect(capturedCtx).toBeDefined();
		expectTypeOf(capturedCtx!.requestUpdate).toBeFunction();
	});
});

// ── useLoadEffect — named deps ─────────────────────────────────────────────────

describe("useLoadEffect — named deps", () => {
	it("setup receives unwrapped dep values when all are defined", async () => {
		using host = new TestHost();
		const valRef = createWritableRef<string>("hello");
		let captured: { val: string } | undefined;
		useLoadEffect(
			({ val }) => {
				captured = { val };
			},
			{ val: valRef },
		);
		await host.willLoad();
		expect(captured).toStrictEqual({ val: "hello" });
	});

	it("setup is skipped when a dep's current is undefined", async () => {
		using host = new TestHost();
		const emptyRef = createWritableRef<string>();
		const setup = vi.fn();
		useLoadEffect(setup, { val: emptyRef });
		await host.willLoad();
		expect(setup).not.toHaveBeenCalled();
	});

	it("supports multiple named deps", async () => {
		using host = new TestHost();
		const aRef = createWritableRef<number>(1);
		const bRef = createWritableRef<string>("b");
		let captured: { a: number; b: string } | undefined;
		useLoadEffect(
			({ a, b }) => {
				captured = { a, b };
			},
			{ a: aRef, b: bRef },
		);
		await host.willLoad();
		expect(captured).toStrictEqual({ a: 1, b: "b" });
	});

	it("skips setup when at least one dep is undefined", async () => {
		using host = new TestHost();
		const aRef = createWritableRef<number>(1);
		const bRef = createWritableRef<string>(); // undefined
		const setup = vi.fn();
		useLoadEffect(setup, { a: aRef, b: bRef });
		await host.willLoad();
		expect(setup).not.toHaveBeenCalled();
	});

	it("cleanup runs on hostDisconnected", async () => {
		using host = new TestHost();
		const valRef = createWritableRef<number>(42);
		const cleanup = vi.fn();
		useLoadEffect(() => cleanup, { val: valRef });
		await host.willLoad();
		host.disconnect();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("dep values are correctly typed", async () => {
		using host = new TestHost();
		const numRef = createWritableRef<number>(7);
		let capturedN: number | undefined;
		useLoadEffect(
			({ n }) => {
				expectTypeOf(n).toBeNumber();
				capturedN = n;
			},
			{ n: numRef },
		);
		await host.willLoad();
		expect(capturedN).toBe(7);
	});
});
