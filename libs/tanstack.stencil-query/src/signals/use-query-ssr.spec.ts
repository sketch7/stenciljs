// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { mount } from "@ssv/stencil-core/testing";
import { useSignalWatcher } from "@ssv/stencil-signals";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQuery } from "./use-query";

describe("$useQuery — SSR auto-prefetch", () => {
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

		it("renders the prefetched data in signal after server mount — data() equals fetched value and isPending() is false", async () => {
			const data = [{ id: 1, title: "SSR post" }];
			const queryFn = vi.fn<() => Promise<typeof data>>().mockResolvedValue(data);

			using m = await mount(() => {
				useSignalWatcher();
				return {
					query: $useQuery({ queryKey: ["ssr-posts"], queryFn }, qc),
				};
			});

			expect(m.query.data()).toStrictEqual(data);
			expect(m.query.isPending()).toBeFalsy();
			expect(m.query.isSuccess()).toBeTruthy();
		});

		it("stays pending when enabled is false — no prefetch, signal is pending", async () => {
			const queryFn = vi.fn<() => Promise<string>>().mockResolvedValue("data");

			using m = await mount(() => {
				useSignalWatcher();
				return {
					query: $useQuery({ queryKey: ["ssr-disabled"], queryFn, enabled: false }, qc),
				};
			});

			expect(queryFn).not.toHaveBeenCalled();
			expect(m.query.isPending()).toBeTruthy();
			expect(m.query.data()).toBeUndefined();
		});

		it("calls prefetchQuery in hostWillLoad", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useSignalWatcher();
				$useQuery({ queryKey: ["ssr-spy"], queryFn: vi.fn<() => unknown>() }, qc);
			});

			expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["ssr-spy"] }));
		});

		it("skips prefetch when enabled is false", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useSignalWatcher();
				$useQuery({ queryKey: ["ssr-skip"], queryFn: vi.fn<() => unknown>(), enabled: false }, qc);
			});

			expect(spy).not.toHaveBeenCalled();
		});
	});

	// ── client ────────────────────────────────────────────────────────────────

	describe("client", () => {
		it("does NOT call prefetchQuery on client", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useSignalWatcher();
				$useQuery({ queryKey: ["client-no-prefetch"], queryFn: vi.fn<() => unknown>() }, qc);
			});

			expect(spy).not.toHaveBeenCalled();
		});
	});
});
