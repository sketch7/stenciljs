import { TestHost, mount } from "@ssv/stencil-core/testing";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrefetchQuery } from "./use-prefetch-query";

describe("usePrefetchQuery", () => {
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
		usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);

		expect(spy).not.toHaveBeenCalled();

		host.connect();
		expect(spy).toHaveBeenCalledOnce();
	});

	it("evaluates the getter at connect time — not before", () => {
		const getOpts = vi.fn(() => ({ queryKey: ["test"] as const, queryFn: vi.fn<() => unknown>() }));

		using host = new TestHost();
		usePrefetchQuery(getOpts, qc);

		expect(getOpts).not.toHaveBeenCalled();

		host.connect();
		expect(getOpts).toHaveBeenCalledOnce();
	});

	// ── on connect ───────────────────────────────────────────────────────────

	it("calls prefetchQuery on hostConnected when no cache entry exists", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");

		using _m = await mount(() => {
			usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["test"] }));
	});

	it("does NOT call prefetchQuery when a cache entry already exists", async () => {
		qc.setQueryData(["test"], 42);
		const spy = vi.spyOn(qc, "prefetchQuery");

		using _m = await mount(() => {
			usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		expect(spy).not.toHaveBeenCalled();
	});

	// ── re-render ────────────────────────────────────────────────────────────

	it("does NOT re-fire on re-render — one-shot", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");

		using m = await mount(() => {
			usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		const callsBefore = spy.mock.calls.length;
		m.render();
		m.render();

		expect(spy).toHaveBeenCalledTimes(callsBefore);
	});

	// ── no subscriptions ─────────────────────────────────────────────────────

	it("does NOT trigger a re-render after the prefetch resolves", async () => {
		using m = await mount(() => {
			usePrefetchQuery({ queryKey: ["test"], queryFn: () => Promise.resolve("data") }, qc);
		});

		const rendersBefore = m.renderCount;
		await vi.waitFor(() => expect(qc.getQueryState(["test"])?.status).toBe("success"));

		expect(m.renderCount).toBe(rendersBefore);
	});
});
