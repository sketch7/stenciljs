import { TestHost } from "@ssv/stencil.core/testing";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useQuery } from "./use-query";

describe("useQuery", () => {
	let host: TestHost;
	let qc: QueryClient;

	beforeEach(() => {
		host = new TestHost();
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	});

	afterEach(() => {
		host.dispose();
		qc.clear();
	});

	it("registers a controller with the host on construction", () => {
		useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		// useQueryClient + useQuery controllers both registered
		expect(host.controllers.size).toBeGreaterThanOrEqual(1);
	});

	it("starts in pending state before connect", () => {
		const query = useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		expect(query.isPending).toBeTruthy();
		expect(query.data).toBeUndefined();
		expect(query.isSuccess).toBeFalsy();
		expect(query.isError).toBeFalsy();
	});

	it("reads cached data immediately after connect", () => {
		qc.setQueryData(["test"], 42);
		const query = useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		host.connect();
		expect(query.data).toBe(42);
		expect(query.isSuccess).toBeTruthy();
		expect(query.isPending).toBeFalsy();
	});

	it("triggers requestUpdate and exposes new data when cache changes", async () => {
		const query = useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		host.connect();
		host.render(); // establishes subscription (runs after hostWillLoad would have completed)

		qc.setQueryData(["test"], 99);
		// notifyManager schedules notifications as microtasks — wait for them to flush
		await vi.waitFor(() => expect(host.renderCount).toBeGreaterThan(0));

		expect(query.data).toBe(99);
	});

	it("exposes error state when queryFn rejects", async () => {
		const query = useQuery(
			{
				queryKey: ["failing"],
				queryFn: () => Promise.reject(new Error("boom")),
				retry: false,
			},
			qc,
		);
		host.connect();
		host.render(); // establishes subscription and triggers the fetch
		await vi.waitFor(() => expect(query.isError).toBeTruthy());
		expect((query.error as Error).message).toBe("boom");
	});

	it("updates options reactively — switches queryKey on re-render", () => {
		let key = "a";
		qc.setQueryData(["a"], "result-a");
		qc.setQueryData(["b"], "result-b");

		const query = useQuery(() => ({ queryKey: [key], queryFn: vi.fn<() => unknown>() }), qc);
		host.connect();
		host.render();
		expect(query.data).toBe("result-a");

		key = "b";
		host.render();
		expect(query.data).toBe("result-b");
	});

	it("clears data and unsubscribes after disconnect", async () => {
		qc.setQueryData(["test"], 1);
		const query = useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		host.connect();
		host.disconnect();

		const countBefore = host.renderCount;
		qc.setQueryData(["test"], 2);
		await Promise.resolve();

		expect(host.renderCount).toBe(countBefore);
		expect(query.data).toBeUndefined();
		expect(query.isPending).toBeTruthy();
	});

	it("refetch returns a promise resolving to the query result", async () => {
		qc.setQueryData(["test"], 1);
		const query = useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>().mockResolvedValue(2) }, qc);
		host.connect();

		const result = await query.refetch();
		expect(result.data).toBe(2);
	});

	it("component subclass pattern — field initializer in class body", () => {
		class ComponentLike extends TestHost {
			readonly query = useQuery({ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }, qc);
		}
		const comp = new ComponentLike();
		qc.setQueryData(["sub"], "hello");
		comp.connect();
		expect(comp.query.data).toBe("hello");
		comp.disconnect();
		comp.dispose();
		expect(comp.query.isPending).toBeTruthy();
	});

	it("exposes isLoading — true while pending, false after data arrives", async () => {
		const query = useQuery({ queryKey: ["loading"], queryFn: () => Promise.resolve("ok") }, qc);
		host.connect();
		host.render(); // establishes subscription → starts fetch → isLoading = true
		expect(query.isLoading).toBeTruthy();

		await vi.waitFor(() => expect(query.isLoading).toBeFalsy());
		expect(query.isLoading).toBeFalsy();
	});

	it("exposes isFetched — false before first fetch, true after data arrives", async () => {
		const query = useQuery({ queryKey: ["fetched"], queryFn: () => Promise.resolve("done") }, qc);
		host.connect();
		expect(query.isFetched).toBeFalsy();

		host.render();
		await vi.waitFor(() => expect(query.isFetched).toBeTruthy());
		expect(query.isFetched).toBeTruthy();
	});

	it("exposes isRefetching — true while a background refetch is in-flight", async () => {
		let resolve!: (v: string) => void;
		qc.setQueryData(["refetch"], "initial");
		const query = useQuery(
			{
				queryKey: ["refetch"],
				queryFn: () =>
					new Promise<string>(r => {
						resolve = r;
					}),
				staleTime: 0,
			},
			qc,
		);
		host.connect();
		host.render();

		// eslint-disable-next-line no-void
		void qc.invalidateQueries({ queryKey: ["refetch"] });
		await vi.waitFor(() => expect(query.isRefetching).toBeTruthy());

		resolve("updated");
		await vi.waitFor(() => expect(query.isRefetching).toBeFalsy());
		expect(query.isRefetching).toBeFalsy();
	});
});
