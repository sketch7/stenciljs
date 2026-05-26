// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQuery } from "./use-query";

describe("$useQuery", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	});

	afterEach(() => {
		qc.clear();
	});

	it("registers a controller with the host on construction", () => {
		using host = new TestHost();
		$useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		expect(host.controllers.size).toBeGreaterThanOrEqual(1);
	});

	it("starts in pending state before connect", () => {
		using _host = new TestHost();
		const query = $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		expect(query.isPending()).toBeTruthy();
		expect(query.data()).toBeUndefined();
		expect(query.isSuccess()).toBeFalsy();
		expect(query.isError()).toBeFalsy();
	});

	it("reads cached data immediately after connect", async () => {
		qc.setQueryData(["test"], 42);
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));
		expect(m.query.data()).toBe(42);
		expect(m.query.isSuccess()).toBeTruthy();
		expect(m.query.isPending()).toBeFalsy();
	});

	it("exposes new data via signals when cache changes", async () => {
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));

		qc.setQueryData(["test"], 99);
		// notifyManager schedules notifications as microtasks — wait for them to flush
		await vi.waitFor(() => expect(m.query.data()).toBe(99));

		expect(m.query.data()).toBe(99);
	});

	it("exposes error state when queryFn rejects", async () => {
		using m = await mount(() => ({
			query: $useQuery(
				{
					queryKey: ["failing"],
					queryFn: () => Promise.reject(new Error("boom")),
					retry: false,
				},
				qc,
			),
		}));
		await vi.waitFor(() => expect(m.query.isError()).toBeTruthy());
		expect((m.query.error() as Error).message).toBe("boom");
	});

	it("updates options reactively — switches queryKey on re-render", async () => {
		let key = "a";
		qc.setQueryData(["a"], "result-a");
		qc.setQueryData(["b"], "result-b");

		using m = await mount(() => ({
			query: $useQuery(() => ({ queryKey: [key], queryFn: vi.fn<() => unknown>() }), qc),
		}));
		expect(m.query.data()).toBe("result-a");

		key = "b";
		m.render();
		expect(m.query.data()).toBe("result-b");
	});

	it("clears data and unsubscribes after disconnect", async () => {
		qc.setQueryData(["test"], 1);
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));
		m.disconnect();

		qc.setQueryData(["test"], 2);
		await Promise.resolve();

		expect(m.query.data()).toBeUndefined();
		expect(m.query.isPending()).toBeTruthy();
	});

	it("refetch returns a promise resolving to the query result", async () => {
		qc.setQueryData(["test"], 1);
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>().mockResolvedValue(2) }, qc),
		}));

		const result = await m.query.refetch();
		expect(result.data).toBe(2);
	});

	it("exposes stable per-field signal identity (memoized computeds)", () => {
		using _host = new TestHost();
		const query = $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		expect(query.data).toBe(query.data);
		expect(query.isPending).toBe(query.isPending);
	});

	it("component subclass pattern — field initializer in class body", async () => {
		class ComponentLike extends TestHost {
			readonly query = $useQuery({ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }, qc);
		}
		using comp = new ComponentLike();
		qc.setQueryData(["sub"], "hello");
		comp.connect();
		await comp.willLoad();
		expect(comp.query.data()).toBe("hello");
		comp.disconnect();
		expect(comp.query.isPending()).toBeTruthy();
	});

	it("exposes isLoading — true while pending, false after data arrives", async () => {
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["loading"], queryFn: () => Promise.resolve("ok") }, qc),
		}));
		// mount() calls render(), establishing subscription → starts fetch → isLoading = true
		expect(m.query.isLoading()).toBeTruthy();

		await vi.waitFor(() => expect(m.query.isLoading()).toBeFalsy());
		expect(m.query.isLoading()).toBeFalsy();
	});

	it("exposes isFetched — false before first fetch, true after data arrives", async () => {
		using host = new TestHost();
		const query = $useQuery({ queryKey: ["fetched"], queryFn: () => Promise.resolve("done") }, qc);
		host.connect();
		expect(query.isFetched()).toBeFalsy();

		await host.willLoad();
		host.render();
		await vi.waitFor(() => expect(query.isFetched()).toBeTruthy());
		expect(query.isFetched()).toBeTruthy();
	});

	it("delivers updated data via signals when queryFn returns a new value for the same key", async () => {
		let value = "initial";
		// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `value` at call time; mockResolvedValue captures it once at setup
		const queryFn = vi.fn<() => Promise<string>>().mockImplementation(() => Promise.resolve(value));

		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn }, qc),
		}));

		await vi.waitFor(() => expect(m.query.isSuccess()).toBeTruthy());
		expect(m.query.data()).toBe("initial");

		value = "updated";
		await m.query.refetch();

		await vi.waitFor(() => expect(m.query.data()).toBe("updated"));
		expect(queryFn).toHaveBeenCalledTimes(2);
	});

	it("re-requests and delivers new data via signals when queryKey changes", async () => {
		let key = "a";
		// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `key` at call time; mockResolvedValue captures it once at setup
		const queryFn = vi.fn<() => Promise<string>>().mockImplementation(() => Promise.resolve(`data-for-${key}`));

		using m = await mount(() => ({
			query: $useQuery(() => ({ queryKey: [key], queryFn }), qc),
		}));

		await vi.waitFor(() => expect(m.query.isSuccess()).toBeTruthy());
		expect(m.query.data()).toBe("data-for-a");

		key = "b";
		m.render(); // switches observer to key "b" → triggers new fetch

		await vi.waitFor(() => expect(m.query.data()).toBe("data-for-b"));
		expect(m.query.isSuccess()).toBeTruthy();
		expect(queryFn).toHaveBeenCalledTimes(2);
	});

	it("exposes isRefetching — true while a background refetch is in-flight", async () => {
		let resolve!: (v: string) => void;
		qc.setQueryData(["refetch"], "initial");
		using m = await mount(() => ({
			query: $useQuery(
				{
					queryKey: ["refetch"],
					queryFn: () =>
						new Promise<string>(r => {
							resolve = r;
						}),
					staleTime: 0,
				},
				qc,
			),
		}));

		// eslint-disable-next-line no-void
		void qc.invalidateQueries({ queryKey: ["refetch"] });
		await vi.waitFor(() => expect(m.query.isRefetching()).toBeTruthy());

		resolve("updated");
		await vi.waitFor(() => expect(m.query.isRefetching()).toBeFalsy());
		expect(m.query.isRefetching()).toBeFalsy();
	});
});
