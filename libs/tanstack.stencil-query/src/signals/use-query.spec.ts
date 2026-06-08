// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { signal } from "@ssv/stencil-signals";
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

	it("registers a controller with the host on construction", async () => {
		using host = await mount(() => {
			$useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});
		expect(host.controllers.size).toBeGreaterThanOrEqual(1);
	});

	it("starts in pending state on connect — no cached data", async () => {
		using _m = await mount(() => ({ query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc) }), {
			afterConnect: mounted => {
				expect(mounted.query.isPending()).toBeTruthy();
				expect(mounted.query.data()).toBeUndefined();
				expect(mounted.query.isSuccess()).toBeFalsy();
				expect(mounted.query.isError()).toBeFalsy();
			},
		});
	});

	it("reads cached data immediately after connect", async () => {
		qc.setQueryData(["test"], 42);
		// staleTime keeps the cached entry fresh so no background refetch fires — otherwise the
		// stale refetch (queryFn returns undefined) would resolve during mount() and overwrite the
		// eager cached read before the assertions run.
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>(), staleTime: Infinity }, qc),
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
					queryFn: async () => {
						throw new Error("boom");
					},
					retry: false,
				},
				qc,
			),
		}));
		await vi.waitFor(() => expect(m.query.isError()).toBeTruthy());
		expect(m.query.error()!.message).toBe("boom");
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

	it("exposes stable per-field signal identity (memoized computeds)", async () => {
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc),
		}));
		expect(m.query.data).toBe(m.query.data);
		expect(m.query.isPending).toBe(m.query.isPending);
	});

	it("component subclass pattern — field initializer in class body", async () => {
		class ComponentLike extends TestHost {
			readonly query = $useQuery({ queryKey: ["sub"], queryFn: vi.fn<() => unknown>() }, qc);
		}
		qc.setQueryData(["sub"], "hello");
		using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
		expect(comp.query.data()).toBe("hello");
		comp.disconnect();
		expect(comp.query.isPending()).toBeTruthy();
	});

	it("exposes isLoading — true while pending, false after data arrives", async () => {
		// A deferred queryFn keeps the fetch in flight across mount() so isLoading is observably true;
		// a fast-resolving promise would settle during mount()'s awaits and report false immediately.
		let resolveFn!: (value: string) => void;
		const pending = new Promise<string>(resolve => {
			resolveFn = resolve;
		});
		using m = await mount(() => ({
			query: $useQuery({ queryKey: ["loading"], queryFn: async () => pending }, qc),
		}));
		// mount() calls render(), establishing subscription → starts fetch → isLoading = true
		expect(m.query.isLoading()).toBeTruthy();

		resolveFn("ok");
		await vi.waitFor(() => expect(m.query.isLoading()).toBeFalsy());
		expect(m.query.isLoading()).toBeFalsy();
	});

	it("exposes isFetched — false before first fetch, true after data arrives", async () => {
		using m = await mount(() => ({ query: $useQuery({ queryKey: ["fetched"], queryFn: async () => "done" }, qc) }), {
			afterConnect: mounted => expect(mounted.query.isFetched()).toBeFalsy(),
		});
		await vi.waitFor(() => expect(m.query.isFetched()).toBeTruthy());
	});

	it("delivers updated data via signals when queryFn returns a new value for the same key", async () => {
		let value = "initial";
		// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `value` at call time; mockResolvedValue captures it once at setup
		const queryFn = vi.fn<() => Promise<string>>().mockImplementation(async () => value);

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

	it("exposes isRefetching — true while a background refetch is in-flight", async () => {
		let resolve!: (v: string) => void;
		qc.setQueryData(["refetch"], "initial");
		using m = await mount(() => ({
			query: $useQuery(
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
		await vi.waitFor(() => expect(m.query.isRefetching()).toBeTruthy());

		resolve("updated");
		await vi.waitFor(() => expect(m.query.isRefetching()).toBeFalsy());
		expect(m.query.isRefetching()).toBeFalsy();
	});

	describe("signal-derived options — client-side reactivity", () => {
		it("retriggeres query when a signal queryKey changes — without explicit re-render", async () => {
			const userId = signal(1);
			// oxlint-disable-next-line vitest/prefer-mock-promise-shorthand -- closure must re-read `userId` at call time; mockResolvedValue captures it once at setup
			const queryFn = vi.fn<() => Promise<string>>().mockImplementation(async () => `user-${userId()}`);

			using m = await mount(() => ({
				query: $useQuery(() => ({ queryKey: ["user", userId()], queryFn }), qc),
			}));

			await vi.waitFor(() => expect(m.query.isSuccess()).toBeTruthy());
			expect(m.query.data()).toBe("user-1");

			// Signal changes — should retrigger without an explicit m.render()
			userId.set(2);

			await vi.waitFor(() => expect(m.query.data()).toBe("user-2"));
			expect(queryFn).toHaveBeenCalledTimes(2);
		});

		it("enables query when a signal-derived `enabled` changes from false to true — without explicit re-render", async () => {
			const isEnabled = signal(false);
			const queryFn = vi.fn<() => Promise<string>>().mockResolvedValue("data");

			using m = await mount(() => ({
				query: $useQuery(() => ({ queryKey: ["test"], queryFn, enabled: isEnabled() }), qc),
			}));

			// Initially disabled — query stays pending, queryFn never called
			expect(m.query.isPending()).toBeTruthy();
			expect(queryFn).not.toHaveBeenCalled();

			// Enable via signal — should trigger fetch without m.render()
			isEnabled.set(true);

			await vi.waitFor(() => expect(m.query.isSuccess()).toBeTruthy());
			expect(m.query.data()).toBe("data");
		});
	});
});
