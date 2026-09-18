// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter for $useQueries SSR tests
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { signal } from "@ssv/stencil-signals";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQueries } from "./signals/use-queries";
import { useQueries } from "./use-queries";

const flush = async (): Promise<void> => {
	await vi.advanceTimersByTimeAsync(0);
	await Promise.resolve();
};

// ── Classic useQueries — SSR auto-prefetch ────────────────────────────────────

describe("useQueries — SSR auto-prefetch", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
	});

	afterEach(() => {
		qc.clear();
	});

	describe("server", () => {
		beforeEach(() => {
			Object.assign(Build, { isServer: true });
		});

		afterEach(() => {
			Object.assign(Build, { isServer: false });
		});

		it("calls prefetchQuery once per non-disabled, non-held element in hostWillLoad", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQueries(
					{
						queries: [
							{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["b"], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				);
			});

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["a"] }));
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["b"] }));
		});

		it("skips prefetch for enabled:false elements", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQueries(
					{
						queries: [
							{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["b"], queryFn: vi.fn<() => unknown>(), enabled: false },
						],
					},
					qc,
				);
			});

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["a"] }));
			expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["b"] }));
		});

		it("skips a held (undefined-segment) element while prefetching non-held siblings", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQueries(
					{
						queries: [
							{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() },
							// ["dep", undefined] — held because of the undefined segment
							{ queryKey: ["dep", undefined], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				);
			});

			// Only the non-held element "a" should be prefetched
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["a"] }));
			expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["dep", undefined] }));
		});
	});

	describe("client", () => {
		it("does not call prefetchQuery on the client", async () => {
			const spy = vi.spyOn(qc, "prefetchQuery");

			using _m = await mount(() => {
				useQueries(
					{
						queries: [
							{ queryKey: ["a"], queryFn: vi.fn<() => unknown>() },
							{ queryKey: ["b"], queryFn: vi.fn<() => unknown>() },
						],
					},
					qc,
				);
			});

			expect(spy).not.toHaveBeenCalled();
		});
	});
});

// ── $useQueries — SSR prefetch signal sync ────────────────────────────────────

describe("$useQueries — SSR prefetch signal sync", () => {
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
		using host = new TestHost();
		const queries = $useQueries(
			{
				queries: [
					{ queryKey: ["ssr-a"], queryFn: async () => "data-a" },
					{ queryKey: ["ssr-b"], queryFn: async () => "data-b" },
				],
			},
			qc,
		);

		host.connect();
		await host.willLoad();
		// Deliberately no host.render() — only the SSR settle re-sync path can update signals here.

		expect(queries()[0].data()).toBe("data-a");
		expect(queries()[0].isPending()).toBeFalsy();
		expect(queries()[1].data()).toBe("data-b");
		expect(queries()[1].isPending()).toBeFalsy();
	});

	it("signal stays pending for disabled elements — prefetch skipped", async () => {
		using host = new TestHost();
		const queries = $useQueries(
			{
				queries: [
					{ queryKey: ["ssr-ok"], queryFn: async () => "ok-data" },
					{ queryKey: ["ssr-disabled"], queryFn: async () => "should-not-run", enabled: false },
				],
			},
			qc,
		);

		host.connect();
		await host.willLoad();

		expect(queries()[0].data()).toBe("ok-data");
		expect(queries()[1].data()).toBeUndefined();
		expect(queries()[1].isPending()).toBeTruthy();
	});
});

/**
 * SSR held/chained settle for $useQueries.
 *
 * When a per-element query key derives from a signal that is initially undefined,
 * hostWillLoad must wait for that key to resolve before running the element's loader —
 * mirroring the $useQuery SSR chained/held behavior.
 */
describe("$useQueries — SSR chained / held-until-key-resolves", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
		vi.useFakeTimers();
		Object.assign(Build, { isServer: true });
	});

	afterEach(() => {
		qc.clear();
		vi.useRealTimers();
		Object.assign(Build, { isServer: false });
	});

	it("holds per-element query until its key resolves, then runs loader once — never with undefined", async () => {
		const heldLoader = vi.fn(async (key: string | undefined) => `held-data:${key}`);
		const immediateLoader = vi.fn(async () => "immediate-data");

		const key = signal<string | undefined>(undefined);
		setTimeout(() => key.set("real-key"), 5000);

		using host = new TestHost();
		$useQueries(
			() => ({
				queries: [
					// Non-held sibling: resolves immediately
					{ queryKey: ["immediate"], queryFn: immediateLoader },
					// Held element: key is signal-derived, initially undefined
					{ queryKey: ["dep", key()] as const, queryFn: async () => heldLoader(key()) },
				],
			}),
			qc,
		);

		host.connect();
		const load = host.willLoad();

		// The key flips to resolve the held query
		await vi.advanceTimersByTimeAsync(5000);
		await load;

		// Held loader must never be called with undefined
		expect(heldLoader).not.toHaveBeenCalledWith(undefined);
		expect(heldLoader).toHaveBeenCalledExactlyOnceWith("real-key");
		// Immediate sibling must have run
		expect(immediateLoader).toHaveBeenCalled();
	});

	it("does not invoke the held element's loader while its key is still undefined", async () => {
		const heldLoader = vi.fn(async (key: string | undefined) => `data:${key}`);
		const key = signal<string | undefined>(undefined);
		setTimeout(() => key.set("real-key"), 5000);

		using host = new TestHost();
		$useQueries(
			() => ({
				queries: [
					{ queryKey: ["other"], queryFn: vi.fn<() => unknown>().mockResolvedValue("other-data") },
					{ queryKey: ["dep", key()] as const, queryFn: async () => heldLoader(key()) },
				],
			}),
			qc,
		);

		host.connect();
		const load = host.willLoad();

		// Before the key resolves, held loader must not have been called
		await Promise.resolve();
		expect(heldLoader).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(5000);
		await load;
	});

	it("aborts all element settles on disconnect — resolves promptly without fetching or waiting out the timeout", async () => {
		const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);
		const heldLoader = vi.fn<() => Promise<string>>(async () => "data");
		const key = signal<string | undefined>(undefined); // never resolves

		using host = new TestHost();
		$useQueries(
			() => ({
				queries: [{ queryKey: ["dep", key()] as const, queryFn: async () => heldLoader() }],
			}),
			qc,
		);

		host.connect();
		let settled = false;
		const load = host.willLoad();
		void load.then(() => {
			settled = true;
		});

		await Promise.resolve();
		expect(settled).toBeFalsy(); // held — still pending

		host.disconnect();
		await load; // must resolve on disconnect, not after the ~15s timeout
		expect(settled).toBeTruthy();
		expect(heldLoader).not.toHaveBeenCalled();

		// Timer must have been cleared — no error log, no fetch
		await vi.advanceTimersByTimeAsync(20_000);
		expect(heldLoader).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();

		errorSpy.mockRestore();
	});

	it("supersedes one element's in-flight prefetch when that element's key changes — sibling unaffected", async () => {
		const resolvers: Record<string, (value: string) => void> = {};
		const heldLoader = vi.fn(
			async (k: string) =>
				new Promise<string>(res => {
					resolvers[k] = res;
				}),
		);
		const immediateLoader = vi.fn(async () => "immediate");
		const key = signal<string | undefined>(undefined);

		using host = new TestHost();
		$useQueries(
			() => ({
				queries: [
					// Immediate sibling — should resolve independently
					{ queryKey: ["immediate"], queryFn: immediateLoader },
					// Held element whose key changes mid-flight
					{ queryKey: ["dep", key()] as const, queryFn: async ({ queryKey }) => heldLoader(queryKey[1] as string) },
				],
			}),
			qc,
		);

		host.connect();
		let settled = false;
		const load = host.willLoad();
		void load.then(() => {
			settled = true;
		});

		// Key resolves to "a" → prefetch "a" starts and stays in flight
		key.set("a");
		await flush();
		expect(heldLoader).toHaveBeenCalledWith("a");

		// Key changes to "b" before "a" resolves → supersedes
		key.set("b");
		await flush();
		expect(heldLoader).toHaveBeenCalledWith("b");

		// Resolving the superseded "a" must NOT settle the SSR wait
		resolvers.a?.("data-a");
		await flush();
		expect(settled).toBeFalsy();

		// Resolving the latest "b" should settle everything
		resolvers.b?.("data-b");
		await load;
		expect(settled).toBeTruthy();
	});
});
