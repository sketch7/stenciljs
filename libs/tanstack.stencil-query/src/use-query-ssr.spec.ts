// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter for $useQuery tests
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { signal } from "@ssv/stencil-signals";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useQuery } from "./signals/use-query";
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

describe("$useQuery — SSR prefetch signal sync", () => {
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
		// RED-GREEN: Without query-observer.ts lines 236-240 (the `.then(() => handlers.onConnect?.())`
		// call after prefetchQuery resolves), the signal is never re-synced from the populated cache.
		// hostWillRender would update it, but SSR components using useSignalWatcher() replace
		// host.render() and may not trigger that path before render(). This test deliberately skips
		// render so only the .then() path can satisfy the assertion.
		using host = new TestHost();
		const query = $useQuery({ queryKey: ["ssr-prefetch-signal"], queryFn: async () => "ssr-data" }, qc);

		host.connect();
		await host.willLoad();
		// Deliberately no host.render() — only the .then() re-sync can update the signal here.

		expect(query.data()).toBe("ssr-data");
		expect(query.isPending()).toBeFalsy();
	});

	it("signal stays pending when enabled is false — prefetch skipped", async () => {
		using host = new TestHost();
		const query = $useQuery({ queryKey: ["ssr-disabled"], queryFn: async () => "should-not-run", enabled: false }, qc);

		host.connect();
		await host.willLoad();

		expect(query.data()).toBeUndefined();
		expect(query.isPending()).toBeTruthy();
	});
});

/**
 * SSR support for chained (dependent) queries.
 *
 * A dependent query's key derives from data that resolves later (an upstream query, or any signal).
 * Until that key is available the query must be **held** — never executed with an `undefined` key —
 * and the SSR `hostWillLoad` settle must **wait** for the key to resolve, then run the query once.
 *
 * Today the per-observer prefetch runs in `hostWillLoad` against a snapshot taken while the key is
 * still `undefined`, so the queryFn fires with `undefined` (and the settle completes before the key
 * is ready). These tests pin the target contract and are RED until the held-and-awaited settle lands.
 */
describe("$useQuery — SSR chained / held-until-key-resolves", () => {
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

	it("holds the query until its key resolves, then runs the loader once — never with undefined", async () => {
		// The loader (queryFn) records every key it is invoked with.
		const loader = vi.fn(async (key: string | undefined) => `data:${key}`);

		// `key` is the query's params: undefined now, flips to a real value after the upstream settles.
		const key = signal<string | undefined>(undefined);
		setTimeout(() => key.set("real-key"), 5000);

		using host = new TestHost();
		$useQuery(() => ({ queryKey: ["dep", key()] as const, queryFn: async () => loader(key()) }), qc);

		host.connect();
		const load = host.willLoad();

		// Upstream resolves: key flips undefined → "real-key". The SSR settle must have waited for it.
		await vi.advanceTimersByTimeAsync(5000);
		await load;

		expect(loader).not.toHaveBeenCalledWith(undefined);
		expect(loader).toHaveBeenCalledExactlyOnceWith("real-key");
	});

	it("does not invoke the loader while the key is still undefined", async () => {
		const loader = vi.fn(async (key: string | undefined) => `data:${key}`);
		const key = signal<string | undefined>(undefined);
		setTimeout(() => key.set("real-key"), 5000);

		using host = new TestHost();
		$useQuery(() => ({ queryKey: ["dep", key()] as const, queryFn: async () => loader(key()) }), qc);

		host.connect();
		const load = host.willLoad();

		// Before the key resolves, nothing should have fetched.
		await Promise.resolve();
		expect(loader).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(5000);
		await load;
	});

	it("aborts the held settle on disconnect — resolves promptly without fetching or waiting out the timeout", async () => {
		const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);
		const loader = vi.fn<() => Promise<string>>(async () => "data");
		const key = signal<string | undefined>(undefined); // never resolves

		using host = new TestHost();
		$useQuery(() => ({ queryKey: ["dep", key()] as const, queryFn: async () => loader() }), qc);

		host.connect();
		let settled = false;
		const load = host.willLoad();
		void load.then(() => {
			settled = true;
		});

		await Promise.resolve();
		expect(settled).toBeFalsy(); // held — still pending

		host.disconnect();
		await load; // resolves on disconnect, not after the ~15s timeout
		expect(settled).toBeTruthy();
		expect(loader).not.toHaveBeenCalled();

		// The timer was cleared on abort — advancing past the budget logs nothing and fetches nothing.
		await vi.advanceTimersByTimeAsync(20_000);
		expect(loader).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();

		errorSpy.mockRestore();
	});

	it("supersedes an in-flight prefetch when the key changes — awaits the latest, not the previous", async () => {
		const resolvers: Record<string, (value: string) => void> = {};
		const loader = vi.fn(
			async (k: string) =>
				new Promise<string>(res => {
					resolvers[k] = res;
				}),
		);
		const key = signal<string | undefined>(undefined);

		using host = new TestHost();
		$useQuery(
			() => ({ queryKey: ["dep", key()] as const, queryFn: async ({ queryKey }) => loader(queryKey[1] as string) }),
			qc,
		);

		host.connect();
		let settled = false;
		const load = host.willLoad();
		void load.then(() => {
			settled = true;
		});

		const flush = async (): Promise<void> => {
			await vi.advanceTimersByTimeAsync(0);
			await Promise.resolve();
		};

		// Key resolves to "a" → prefetch "a" starts and stays in flight.
		key.set("a");
		await flush();
		expect(loader).toHaveBeenCalledWith("a");

		// Key changes to "b" before "a" resolves → the previous prefetch is superseded by "b".
		key.set("b");
		await flush();
		expect(loader).toHaveBeenCalledWith("b");

		// Resolving the superseded "a" must NOT settle the SSR wait.
		resolvers.a?.("data-a");
		await flush();
		expect(settled).toBeFalsy();

		// Resolving the latest "b" settles it.
		resolvers.b?.("data-b");
		await load;
		expect(settled).toBeTruthy();
	});
});
