import { TestHost, mount } from "@ssv/stencil-core/testing";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useQuery } from "./use-query";

describe("useQuery", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	});

	afterEach(() => {
		qc.clear();
	});

	it("registers a controller with the host on construction", async () => {
		using host = await mount(() => {
			useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});
		// useQueryClient + useQuery controllers both registered
		expect(host.controllers.size).toBeGreaterThanOrEqual(1);
	});

	it("starts in pending state on connect — no cached data", async () => {
		using _m = await mount(() => ({ query: useQuery({ queryKey: ["test"], queryFn: vi.fn() }, qc) }), {
			afterConnect: mounted => {
				expect(mounted.query().isPending).toBeTruthy();
				expect(mounted.query().data).toBeUndefined();
				expect(mounted.query().isSuccess).toBeFalsy();
				expect(mounted.query().isError).toBeFalsy();
			},
		});
	});

	it("reads cached data immediately after connect", async () => {
		qc.setQueryData(["test"], 42);
		using m = await mount(() => ({
			query: useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity }, qc),
		}));
		expect(m.query().data).toBe(42);
		expect(m.query().isSuccess).toBeTruthy();
		expect(m.query().isPending).toBeFalsy();
	});

	it("triggers requestUpdate and exposes new data when cache changes", async () => {
		using m = await mount(() => ({
			query: useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));
		qc.setQueryData(["test"], 99);
		// notifyManager schedules notifications as microtasks — wait for them to flush
		await vi.waitFor(() => expect(m.renderCount).toBeGreaterThan(0));

		expect(m.query().data).toBe(99);
	});

	it("exposes error state when queryFn rejects", async () => {
		using m = await mount(() => ({
			query: useQuery(
				{
					queryKey: ["failing"],
					queryFn: async () => {
						throw new Error("boom");
					},
					retry: false,
				},
				qc,
			),
		}));
		await vi.waitFor(() => expect(m.query().isError).toBeTruthy());
		expect(m.query().error!.message).toBe("boom");
	});

	it("updates options reactively — switches queryKey on re-render", async () => {
		let key = "a";
		qc.setQueryData(["a"], "result-a");
		qc.setQueryData(["b"], "result-b");

		using m = await mount(() => ({
			query: useQuery(() => ({ queryKey: [key], queryFn: vi.fn<() => unknown>() }), qc),
		}));
		expect(m.query().data).toBe("result-a");

		key = "b";
		m.render();
		expect(m.query().data).toBe("result-b");
	});

	it("clears data and unsubscribes after disconnect", async () => {
		qc.setQueryData(["test"], 1);
		using m = await mount(() => ({
			query: useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));
		m.disconnect();

		const countBefore = m.renderCount;
		qc.setQueryData(["test"], 2);
		await Promise.resolve();

		expect(m.renderCount).toBe(countBefore);
		expect(m.query().data).toBeUndefined();
		expect(m.query().isPending).toBeTruthy();
	});

	it("refetch returns a promise resolving to the query result", async () => {
		qc.setQueryData(["test"], 1);
		using m = await mount(() => ({
			query: useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>().mockResolvedValue(2) }, qc),
		}));

		const result = await m.query().refetch();
		expect(result.data).toBe(2);
	});

	it("component subclass pattern — field initializer in class body", async () => {
		class ComponentLike extends TestHost {
			readonly query = useQuery({ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }, qc);
		}
		qc.setQueryData(["sub"], "hello");
		using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
		expect(comp.query().data).toBe("hello");
		comp.disconnect();
		expect(comp.query().isPending).toBeTruthy();
	});

	it("exposes isLoading — true while pending, false after data arrives", async () => {
		using m = await mount(() => ({ query: useQuery({ queryKey: ["loading"], queryFn: async () => "ok" }, qc) }), {
			afterConnect: mounted => expect(mounted.query().isLoading).toBeTruthy(),
		});
		await vi.waitFor(() => expect(m.query().isLoading).toBeFalsy());
	});

	it("exposes isFetched — false before first fetch, true after data arrives", async () => {
		using m = await mount(() => ({ query: useQuery({ queryKey: ["fetched"], queryFn: async () => "done" }, qc) }), {
			afterConnect: mounted => expect(mounted.query().isFetched).toBeFalsy(),
		});
		await vi.waitFor(() => expect(m.query().isFetched).toBeTruthy());
	});

	it("delivers updated data when queryFn returns a new value for the same key", async () => {
		let value = "initial";
		// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `value` at call time; mockResolvedValue captures it once at setup
		const queryFn = vi.fn<() => Promise<string>>().mockImplementation(async () => value);

		using m = await mount(() => ({
			query: useQuery({ queryKey: ["test"], queryFn }, qc),
		}));

		await vi.waitFor(() => expect(m.query().isSuccess).toBeTruthy());
		expect(m.query().data).toBe("initial");

		value = "updated";
		await m.query().refetch();

		expect(m.query().data).toBe("updated");
		expect(queryFn).toHaveBeenCalledTimes(2);
	});

	it("re-requests and delivers new data from queryFn when queryKey changes", async () => {
		let key = "a";
		// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `key` at call time; mockResolvedValue captures it once at setup
		const queryFn = vi.fn<() => Promise<string>>().mockImplementation(async () => `data-for-${key}`);

		using m = await mount(() => ({
			query: useQuery(() => ({ queryKey: [key], queryFn }), qc),
		}));

		await vi.waitFor(() => expect(m.query().isSuccess).toBeTruthy());
		expect(m.query().data).toBe("data-for-a");

		key = "b";
		m.render(); // switches observer to key "b" → triggers new fetch

		await vi.waitFor(() => expect(m.query().data).toBe("data-for-b"));
		expect(m.query().isSuccess).toBeTruthy();
		expect(queryFn).toHaveBeenCalledTimes(2);
	});

	it("exposes isRefetching — true while a background refetch is in-flight", async () => {
		let resolve!: (v: string) => void;
		qc.setQueryData(["refetch"], "initial");
		using m = await mount(() => ({
			query: useQuery(
				{
					queryKey: ["refetch"],
					queryFn: async () =>
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
		await vi.waitFor(() => expect(m.query().isRefetching).toBeTruthy());

		resolve("updated");
		await vi.waitFor(() => expect(m.query().isRefetching).toBeFalsy());
		expect(m.query().isRefetching).toBeFalsy();
	});
});
