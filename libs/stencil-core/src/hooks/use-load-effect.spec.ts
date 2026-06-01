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

	describe("reactive re-runs on dep change", () => {
		it("re-runs setup when a dep value changes between renders", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<number>(1);
			const setup = vi.fn();
			useLoadEffect(setup, { val: valRef });
			await host.willLoad();
			expect(setup).toHaveBeenCalledOnce();

			valRef.current = 2;
			host.render();
			expect(setup).toHaveBeenCalledTimes(2);
		});

		it("does not re-run setup when dep values are unchanged", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<number>(1);
			const setup = vi.fn();
			useLoadEffect(setup, { val: valRef });
			await host.willLoad();
			expect(setup).toHaveBeenCalledOnce();

			host.render();
			host.render();
			expect(setup).toHaveBeenCalledOnce();
		});

		it("calls cleanup before re-running setup on dep change", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<number>(1);
			const cleanup = vi.fn();
			useLoadEffect(() => cleanup, { val: valRef });
			await host.willLoad();

			valRef.current = 2;
			host.render();
			expect(cleanup).toHaveBeenCalledOnce();
		});

		it("re-run setup receives new dep values", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<number>(1);
			const captured: number[] = [];
			useLoadEffect(
				({ val }) => {
					captured.push(val);
				},
				{ val: valRef },
			);
			await host.willLoad();

			valRef.current = 42;
			host.render();
			expect(captured).toStrictEqual([1, 42]);
		});

		it("runs cleanup and pauses effect when dep becomes null", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<string | null>("hello");
			const setup = vi.fn();
			const cleanup = vi.fn();
			setup.mockReturnValue(cleanup);
			useLoadEffect(setup, { val: valRef });
			await host.willLoad();
			expect(setup).toHaveBeenCalledOnce();

			valRef.current = null;
			host.render();
			expect(cleanup).toHaveBeenCalledOnce();
			// no re-run while dep is null
			host.render();
			expect(setup).toHaveBeenCalledOnce();
		});

		it("resumes effect when dep becomes non-null again after being null", async () => {
			using host = new TestHost();
			const valRef = createWritableRef<string | null>("hello");
			const setup = vi.fn();
			useLoadEffect(setup, { val: valRef });
			await host.willLoad();

			valRef.current = null;
			host.render();

			valRef.current = "world";
			host.render();
			expect(setup).toHaveBeenCalledTimes(2);
		});
	});
});

// ── useLoadEffect — getter fn deps ────────────────────────────────────────────

describe("useLoadEffect — getter fn deps", () => {
	it("setup receives value from a getter fn dep", async () => {
		using host = new TestHost();
		const signalVal = "hello";
		let captured: string | undefined;
		useLoadEffect(
			({ val }) => {
				captured = val;
			},
			{ val: () => signalVal },
		);
		await host.willLoad();
		expect(captured).toBe("hello");
	});

	it("setup is skipped when a getter fn dep returns undefined", async () => {
		using host = new TestHost();
		const setup = vi.fn();
		useLoadEffect(setup, { val: () => undefined as string | undefined });
		await host.willLoad();
		expect(setup).not.toHaveBeenCalled();
	});

	it("re-runs when getter fn returns a new value", async () => {
		using host = new TestHost();
		let signalVal = 1;
		const setup = vi.fn();
		useLoadEffect(setup, { val: () => signalVal });
		await host.willLoad();
		signalVal = 2;
		host.render();
		expect(setup).toHaveBeenCalledTimes(2);
	});

	it("does not re-run when getter fn returns the same value", async () => {
		using host = new TestHost();
		const signalVal = 1;
		const setup = vi.fn();
		useLoadEffect(setup, { val: () => signalVal });
		await host.willLoad();
		host.render();
		host.render();
		expect(setup).toHaveBeenCalledOnce();
	});

	it("pauses and runs cleanup when getter fn returns null", async () => {
		using host = new TestHost();
		let signalVal: number | null = 42;
		const setup = vi.fn();
		const cleanup = vi.fn();
		setup.mockReturnValue(cleanup);
		useLoadEffect(setup, { val: () => signalVal });
		await host.willLoad();
		signalVal = null;
		host.render();
		expect(cleanup).toHaveBeenCalledOnce();
		host.render();
		expect(setup).toHaveBeenCalledOnce(); // still paused
	});
});
