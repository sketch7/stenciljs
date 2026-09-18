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

		using _host = new TestHost();
		usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);

		expect(spy).not.toHaveBeenCalled();
	});

	it("calls prefetchQuery on hostWillLoad", async () => {
		const spy = vi.spyOn(qc, "prefetchQuery");

		using host = new TestHost();
		usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);

		host.connect();
		expect(spy).not.toHaveBeenCalled();

		await host.willLoad();
		expect(spy).toHaveBeenCalledOnce();
	});

	it("evaluates the getter at load time — not before", async () => {
		const getOpts = vi.fn(() => ({ queryKey: ["test"] as const, queryFn: vi.fn<() => unknown>() }));

		using host = new TestHost();
		usePrefetchQuery(getOpts, qc);

		expect(getOpts).not.toHaveBeenCalled();

		host.connect();
		expect(getOpts).not.toHaveBeenCalled();

		await host.willLoad();
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

	it("calls prefetchQuery even when a cache entry already exists", async () => {
		qc.setQueryData(["test"], 42);
		const spy = vi.spyOn(qc, "prefetchQuery");

		using _m = await mount(() => {
			usePrefetchQuery({ queryKey: ["test"], queryFn: vi.fn<() => unknown>() }, qc);
		});

		expect(spy).toHaveBeenCalledOnce();
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
			usePrefetchQuery({ queryKey: ["test"], queryFn: async () => "data" }, qc);
		});

		const rendersBefore = m.renderCount;
		await vi.waitFor(() => expect(qc.getQueryState(["test"])?.status).toBe("success"));

		expect(m.renderCount).toBe(rendersBefore);
	});
});
