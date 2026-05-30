// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQueries } from "./use-queries";

describe("$useQueries", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	});

	afterEach(() => {
		qc.clear();
	});

	it("registers a controller with the host on construction", async () => {
		using host = await mount(() => {
			$useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc);
		});
		expect(host.controllers.size).toBeGreaterThanOrEqual(1);
	});

	it("starts every query in pending state on connect — no cached data", async () => {
		using _m = await mount(
			() => ({
				queries: $useQueries(
					{
						queries: [
							{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["b"], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				),
			}),
			{
				afterConnect: mounted => {
					const results = mounted.queries();
					expect(results).toHaveLength(2);
					expect(results[0].isPending).toBeTruthy();
					expect(results[1].isPending).toBeTruthy();
				},
			},
		);
	});

	it("reads cached data immediately after connect for all queries", async () => {
		qc.setQueryData(["a"], 1);
		qc.setQueryData(["b"], 2);
		using m = await mount(() => ({
			queries: $useQueries(
				{
					queries: [
						{ queryKey: ["a"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity },
						{ queryKey: ["b"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity },
					],
				},
				qc,
			),
		}));
		expect(m.queries()[0].data).toBe(1);
		expect(m.queries()[1].data).toBe(2);
	});

	it("exposes new data via the signal when cache changes", async () => {
		using m = await mount(() => ({
			queries: $useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc),
		}));
		qc.setQueryData(["a"], 99);
		await vi.waitFor(() => expect(m.queries()[0].data).toBe(99));
	});

	it("supports combine to derive a single value", async () => {
		qc.setQueryData(["a"], 10);
		qc.setQueryData(["b"], 20);
		using m = await mount(() => ({
			total: $useQueries(
				{
					queries: [
						{ queryKey: ["a"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity },
						{ queryKey: ["b"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity },
					],
					combine: results => results.reduce((sum, r) => sum + ((r.data as number) ?? 0), 0),
				},
				qc,
			),
		}));
		expect(m.total()).toBe(30);
	});

	it("reactively adds a query when the queries array grows", async () => {
		let keys = ["a"];
		qc.setQueryData(["a"], "ra");
		qc.setQueryData(["b"], "rb");

		using m = await mount(() => ({
			queries: $useQueries(
				() => ({ queries: keys.map(k => ({ queryKey: [k], queryFn: vi.fn<() => unknown>() })) }),
				qc,
			),
		}));
		expect(m.queries()).toHaveLength(1);

		keys = ["a", "b"];
		m.render();
		expect(m.queries()).toHaveLength(2);
		expect(m.queries()[1].data).toBe("rb");
	});

	it("clears data and unsubscribes after disconnect", async () => {
		qc.setQueryData(["a"], 1);
		using m = await mount(() => ({
			queries: $useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc),
		}));
		m.disconnect();

		qc.setQueryData(["a"], 2);
		await Promise.resolve();

		expect(m.queries()[0]?.data).toBeUndefined();
	});

	it("component subclass pattern — field initializer in class body", async () => {
		class ComponentLike extends TestHost {
			readonly queries = $useQueries({ queries: [{ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }] }, qc);
		}
		qc.setQueryData(["sub"], "hello");
		using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
		expect(comp.queries()[0].data).toBe("hello");
	});
});
