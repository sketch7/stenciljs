// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter for $useQuery tests
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQuery } from "./signals/use-query";
import { useQuery } from "./use-query";

describe("useQuery — SSR auto-prefetch", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
	});

	afterEach(() => {
		qc.clear();
	});

	// ── server ────────────────────────────────────────────────────────────────

	describe("server", () => {
		beforeEach(() => {
			Object.assign(Build, { isServer: true });
		});

		afterEach(() => {
			Object.assign(Build, { isServer: false });
		});

		it("calls prefetchQuery in hostWillLoad", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
			});

			expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["test"] }));
		});

		it("does not call prefetchQuery before hostWillLoad", () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using host = new TestHost();
			useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);

			host.connect();

			expect(spy).not.toHaveBeenCalled();
		});

		it("skips prefetch when enabled is false", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>(), enabled: false }, qc);
			});

			expect(spy).not.toHaveBeenCalled();
		});

		it("evaluates getter options at hostWillLoad time", async () => {
			const getOpts = vi.fn(() => ({
				queryKey: ["test"] as const,
				queryFn: vi.fn<() => unknown>(),
			}));

			using host = new TestHost();
			useQuery(getOpts, qc);

			expect(getOpts).not.toHaveBeenCalled();

			host.connect();
			expect(getOpts).not.toHaveBeenCalled();

			await host.willLoad();
			expect(getOpts).toHaveBeenCalled();
		});
	});

	// ── client ────────────────────────────────────────────────────────────────

	describe("client", () => {
		it("does not call prefetchQuery", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
			});

			expect(spy).not.toHaveBeenCalled();
		});
	});
});

describe("$useQuery — SSR prefetch signal sync", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
		Object.assign(Build, { isServer: true });
	});

	afterEach(() => {
		qc.clear();
		Object.assign(Build, { isServer: false });
	});

	it("signal carries prefetched data after hostWillLoad — without calling render", async () => {
		// RED-GREEN: Without query-observer.ts lines 236-240 (the `.then(() => handlers.onConnect?.())`
		// call after prefetchQuery resolves), the signal is never re-synced from the populated cache.
		// hostWillRender would update it, but SSR components using useSignalWatcher() replace
		// host.render() and may not trigger that path before render(). This test deliberately skips
		// render so only the .then() path can satisfy the assertion.
		using host = new TestHost();
		const query = $useQuery({ queryKey: ["ssr-prefetch-signal"], queryFn: async () => "ssr-data" }, qc);

		host.connect();
		await host.willLoad();
		// Deliberately no host.render() — only the .then() re-sync can update the signal here.

		expect(query.data()).toBe("ssr-data");
		expect(query.isPending()).toBeFalsy();
	});

	it("signal stays pending when enabled is false — prefetch skipped", async () => {
		using host = new TestHost();
		const query = $useQuery({ queryKey: ["ssr-disabled"], queryFn: async () => "should-not-run", enabled: false }, qc);

		host.connect();
		await host.willLoad();

		expect(query.data()).toBeUndefined();
		expect(query.isPending()).toBeTruthy();
	});
});
