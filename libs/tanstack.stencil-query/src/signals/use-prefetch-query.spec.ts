// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $usePrefetchQuery } from "./use-prefetch-query";

describe("$usePrefetchQuery", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
	});

	afterEach(() => {
		qc.clear();
	});

	// ── pre-connect ──────────────────────────────────────────────────────────

	it("does NOT call prefetchQuery before hostConnected", () => {
		const spy = vi.spyOn(qc, "prefetchQuery");

		using host = new TestHost();
		useSignalWatcher();
		$usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);

		expect(spy).not.toHaveBeenCalled();

		host.connect();
		expect(spy).toHaveBeenCalledOnce();
	});

	// ── on connect ───────────────────────────────────────────────────────────

	it("calls prefetchQuery on hostConnected when no cache entry exists", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");

		using _m = await mount(() => {
			useSignalWatcher();
			$usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["test"] }));
	});

	it("does NOT call prefetchQuery when a cache entry already exists", async () => {
		qc.setQueryData(["test"], 42);
		const spy = vi.spyOn(qc, "prefetchQuery");

		using _m = await mount(() => {
			useSignalWatcher();
			$usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		expect(spy).not.toHaveBeenCalled();
	});

	// ── signal reactivity ────────────────────────────────────────────────────

	it("re-fires when a signal accessed in the getter changes", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");
		const postId = signal(1);

		using _m = await mount(() => {
			useSignalWatcher();
			$usePrefetchQuery(
				() => ({
					queryKey: ["post", postId()] as const,
					queryFn: vi.fn<() => unknown>(),
				}),
				qc,
			);
		});

		expect(spy).toHaveBeenCalledOnce();

		// Change signal — effect should re-run for the new key (no cache entry for key 2)
		postId.set(2);
		await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
		expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: ["post", 2] }));
	});

	it("does NOT re-fire when guard holds — cache entry exists for new key", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");
		const postId = signal(1);
		qc.setQueryData(["post", 2], { id: 2 });

		using _m = await mount(() => {
			useSignalWatcher();
			$usePrefetchQuery(
				() => ({
					queryKey: ["post", postId()] as const,
					queryFn: vi.fn<() => unknown>(),
				}),
				qc,
			);
		});

		// First key has no cache — should prefetch
		expect(spy).toHaveBeenCalledOnce();

		// Switch to key 2 which IS cached — guard should skip prefetch
		postId.set(2);
		await Promise.resolve();

		expect(spy).toHaveBeenCalledOnce(); // still only one call
	});

	// ── disconnect ───────────────────────────────────────────────────────────

	it("disposes the effect on hostDisconnected — no further fires after disconnect", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");
		const postId = signal(1);

		using m = await mount(() => {
			useSignalWatcher();
			$usePrefetchQuery(
				() => ({
					queryKey: ["post", postId()] as const,
					queryFn: vi.fn<() => unknown>(),
				}),
				qc,
			);
		});

		expect(spy).toHaveBeenCalledOnce();

		m.disconnect();
		const callsBeforeSignalChange = spy.mock.calls.length;

		// Change signal after disconnect — should NOT trigger another prefetch
		postId.set(99);
		await Promise.resolve();

		expect(spy).toHaveBeenCalledTimes(callsBeforeSignalChange);
	});
});
