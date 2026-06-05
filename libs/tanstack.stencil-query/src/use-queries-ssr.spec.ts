// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { mount } from "@ssv/stencil-core/testing";
import { useSignalWatcher } from "@ssv/stencil-signals";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQueries } from "./signals/use-queries";
import { useQueries } from "./use-queries";

describe("useQueries / $useQueries — SSR auto-prefetch", () => {
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

		describe("useQueries", () => {
			it("prefetches each enabled query before render", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					useQueries(
						{
							queries: [
								{ queryKey: ["q1"], queryFn: vi.fn<() => unknown>() },
								{ queryKey: ["q2"], queryFn: vi.fn<() => unknown>() },
							],
						},
						qc,
					);
				});

				expect(spy).toHaveBeenCalledTimes(2);
				expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["q1"] }));
				expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["q2"] }));
			});

			it("skips queries with enabled: false", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					useQueries(
						{
							queries: [
								{ queryKey: ["q-enabled"], queryFn: vi.fn<() => unknown>() },
								{ queryKey: ["q-disabled"], queryFn: vi.fn<() => unknown>(), enabled: false },
							],
						},
						qc,
					);
				});

				expect(spy).toHaveBeenCalledOnce();
				expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["q-enabled"] }));
			});

			it("skips prefetch when all queries are disabled", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					useQueries(
						{
							queries: [
								{ queryKey: ["q-all-disabled-1"], queryFn: vi.fn<() => unknown>(), enabled: false },
								{ queryKey: ["q-all-disabled-2"], queryFn: vi.fn<() => unknown>(), enabled: false },
							],
						},
						qc,
					);
				});

				expect(spy).not.toHaveBeenCalled();
			});

			it("evaluates getter options at hostWillLoad time", async () => {
				const getOpts = vi.fn(() => ({
					queries: [{ queryKey: ["getter-q"], queryFn: vi.fn<() => unknown>() }],
				}));

				using host = await mount(() => {
					useQueries(getOpts, qc);
				});

				// getOpts should have been called during willLoad (mount calls willLoad internally)
				expect(getOpts).toHaveBeenCalledWith();
				void host;
			});
		});

		describe("$useQueries", () => {
			it("prefetches each enabled query and reflects data in per-element signals", async () => {
				const data1 = [{ id: 1 }];
				const data2 = [{ id: 2 }];

				using m = await mount(() => {
					useSignalWatcher();
					return {
						results: $useQueries(
							{
								queries: [
									{ queryKey: ["sq1"], queryFn: vi.fn<() => Promise<typeof data1>>().mockResolvedValue(data1) },
									{ queryKey: ["sq2"], queryFn: vi.fn<() => Promise<typeof data2>>().mockResolvedValue(data2) },
								],
							},
							qc,
						),
					};
				});

				const results = m.results();
				expect(results).toHaveLength(2);
				expect(results[0].data()).toStrictEqual(data1);
				expect(results[0].isPending()).toBeFalsy();
				expect(results[1].data()).toStrictEqual(data2);
				expect(results[1].isPending()).toBeFalsy();
			});

			it("skips elements with enabled: false in $useQueries", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					useSignalWatcher();
					$useQueries(
						{
							queries: [
								{ queryKey: ["sq-en"], queryFn: vi.fn<() => unknown>() },
								{ queryKey: ["sq-dis"], queryFn: vi.fn<() => unknown>(), enabled: false },
							],
						},
						qc,
					);
				});

				expect(spy).toHaveBeenCalledOnce();
				expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["sq-en"] }));
			});
		});
	});

	// ── client ────────────────────────────────────────────────────────────────

	describe("client", () => {
		it("useQueries does NOT call prefetchQuery on client", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQueries(
					{
						queries: [
							{ queryKey: ["client-q1"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["client-q2"], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				);
			});

			expect(spy).not.toHaveBeenCalled();
		});

		it("$useQueries does NOT call prefetchQuery on client", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useSignalWatcher();
				$useQueries(
					{
						queries: [
							{ queryKey: ["client-sq1"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["client-sq2"], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				);
			});

			expect(spy).not.toHaveBeenCalled();
		});
	});
});
