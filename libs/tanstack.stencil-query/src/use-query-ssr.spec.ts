import { TestHost, mount } from "@ssv/stencil-core/testing";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
			expect(getOpts).toHaveBeenCalledWith();
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
