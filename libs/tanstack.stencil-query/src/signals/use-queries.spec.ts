// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import type { Signal } from "@ssv/stencil-signals";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { $useQueries } from "./use-queries";
import type { QuerySignalResult } from "./use-query";

describe("$useQueries", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	});

	afterEach(() => {
		qc.clear();
	});

	it("registers a controller with the host on construction", async () => {
		using m = await mount(() => {
			$useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc);
		});
		expect(m.controllers.size).toBeGreaterThanOrEqual(1);
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
					expect(results[0].isPending()).toBeTruthy();
					expect(results[1].isPending()).toBeTruthy();
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
		expect(m.queries()[0].data()).toBe(1);
		expect(m.queries()[1].data()).toBe(2);
	});

	it("each field is a callable signal — fine-grained reactivity", async () => {
		qc.setQueryData(["a"], "hello");
		using m = await mount(() => ({
			queries: $useQueries(
				{ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity }] },
				qc,
			),
		}));
		const result = m.queries()[0];
		expectTypeOf(result.isPending).toBeFunction();
		expectTypeOf(result.data).toBeFunction();
		expectTypeOf(result.isError).toBeFunction();
		expect(result.isPending()).toBeFalsy();
		expect(result.isSuccess()).toBeTruthy();
		expect(result.data()).toBe("hello");
	});

	it("per-element signal updates when cache changes for that query only", async () => {
		qc.setQueryData(["a"], "a0");
		qc.setQueryData(["b"], "b0");
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
		const r0 = m.queries()[0];
		const r1 = m.queries()[1];
		qc.setQueryData(["a"], "a1");
		await vi.waitFor(() => expect(r0.data()).toBe("a1"));
		// r1 proxy object is stable; data for b unchanged
		expect(r1.data()).toBe("b0");
	});

	it("refetch is a plain function (not a signal)", async () => {
		using m = await mount(() => ({
			queries: $useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc),
		}));
		expectTypeOf(m.queries()[0].refetch).toBeFunction();
	});

	it("exposes new data via the signal when cache changes", async () => {
		using m = await mount(() => ({
			queries: $useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc),
		}));
		qc.setQueryData(["a"], 99);
		await vi.waitFor(() => expect(m.queries()[0].data()).toBe(99));
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

	it("combine path returns a plain value signal (not per-field proxies)", async () => {
		qc.setQueryData(["a"], 5);
		using m = await mount(() => ({
			total: $useQueries(
				{
					queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity }],
					combine: results => (results[0].data as number) ?? 0,
				},
				qc,
			),
		}));
		// combine path returns a number directly, not a signal
		expectTypeOf(m.total()).toBeNumber();
		expect(m.total()).toBe(5);
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
		expect(m.queries()[1].data()).toBe("rb");
	});

	it("clears data and unsubscribes after disconnect", async () => {
		qc.setQueryData(["a"], 1);
		using m = await mount(() => ({
			queries: $useQueries({ queries: [{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() }] }, qc),
		}));
		m.disconnect();

		qc.setQueryData(["a"], 2);
		await Promise.resolve();

		expect(m.queries()[0]?.data()).toBeUndefined();
	});

	it("component subclass pattern — field initializer in class body", async () => {
		class ComponentLike extends TestHost {
			readonly queries = $useQueries({ queries: [{ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }] }, qc);
		}
		qc.setQueryData(["sub"], "hello");
		using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
		expect(comp.queries()[0].data()).toBe("hello");
	});

	it("homogeneous .map() call infers Signal<QuerySignalResult<TData>[]> without annotation", async () => {
		using m = await mount(() => ({
			queries: $useQueries(
				() => ({ queries: [1, 2].map(id => ({ queryKey: ["p", id], queryFn: async () => id * 10 })) }),
				qc,
			),
		}));
		// Type check: result is Signal<QuerySignalResult<number>[]> — data() is Signal<number | undefined>
		expectTypeOf(m.queries).toEqualTypeOf<Signal<QuerySignalResult<number>[]>>();
		qc.setQueryData(["p", 1], 100);
		await vi.waitFor(() => expect(m.queries()[0].data()).toBe(100));
	});
});
