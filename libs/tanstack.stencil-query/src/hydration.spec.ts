import { TestHost } from "@ssv/stencil-core/testing";
import { provideTransferState, scriptId } from "@ssv/stencil-core/transfer-state";
import { QueryClient, dehydrate, hydrate } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provideQueryClient } from "./query-client-context";
import { useQuery } from "./use-query";

// ── Shared helpers ────────────────────────────────────────────────────────────

type MockScript = {
	type: string;
	id: string;
	textContent: string;
	remove: ReturnType<typeof vi.fn<() => void>>;
};

function makeMockScript(scope: string, data: unknown): MockScript {
	return {
		type: "application/json",
		id: scriptId(scope),
		textContent: JSON.stringify(data),
		remove: vi.fn<() => void>(),
	};
}

function attachShadowRoot(host: TestHost, script: MockScript | null): void {
	(host as unknown as Record<string, unknown>)["shadowRoot"] = {
		querySelector: (sel: string) => (script && sel === `#${script.id}` ? script : null),
	};
}

describe("hydration", () => {
	it("dehydrate captures query state", async () => {
		const qc = new QueryClient();
		await qc.prefetchQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([{ id: 1, title: "Hello" }]) });

		const state = dehydrate(qc);

		expect(state.queries).toHaveLength(1);
		expect(state.queries[0].queryKey).toStrictEqual(["posts"]);
	});

	it("hydrate restores query state into a fresh client", async () => {
		const source = new QueryClient();
		await source.prefetchQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([{ id: 1 }]) });
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		hydrate(target, state);

		expect(target.getQueryData(["posts"])).toStrictEqual([{ id: 1 }]);
	});

	it("hydrated client returns data immediately without fetch in useQuery", async () => {
		using host = new TestHost();
		const source = new QueryClient();
		source.setQueryData(["posts"], [{ id: 1, title: "SSR post" }]);
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		hydrate(target, state);

		const query = useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]) }, target);
		host.connect();
		await host.willLoad();

		expect(query().data).toStrictEqual([{ id: 1, title: "SSR post" }]);
		expect(query().isSuccess).toBeTruthy();
	});

	it("dehydrate excludes queries that have not been fetched", () => {
		const qc = new QueryClient();
		const state = dehydrate(qc);
		expect(state.queries).toHaveLength(0);
	});

	it("hydrate merges into existing cache without overwriting fresh data", async () => {
		const source = new QueryClient();
		await source.prefetchQuery({ queryKey: ["item"], queryFn: () => Promise.resolve("stale") });
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		target.setQueryData(["item"], "fresh");
		hydrate(target, state);

		// Fresh data wins over dehydrated stale data (query-core default)
		expect(target.getQueryData(["item"])).toBe("fresh");
	});
});

// ── provideQueryClient({ withHydration }) SSR hydration ──────────────────────
describe("provideQueryClient({ withHydration }) SSR hydration", () => {
	// provideTransferState and provideQueryClient both call provideContext, which calls
	// host.addEventListener in hostConnected — stub it on the test host.
	class EventTestHost extends TestHost {
		addEventListener = vi.fn<() => void>();
		removeEventListener = vi.fn<() => void>();
		dispatchEvent = vi.fn<() => boolean>(() => false);
	}

	beforeEach(() => {
		vi.stubGlobal("window", {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("provideQueryClient hydrates the QueryClient from the transfer state on connect", () => {
		using host = new EventTestHost();
		const serverData = [{ id: 1, title: "SSR post" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		// DEHYDRATED_KEY = makeTransferKey("state") = "state"
		const script = makeMockScript("hyd-basic", { state: dehydrate(serverQc) });
		serverQc.clear();
		attachShadowRoot(host, script);

		// provideTransferState must be registered BEFORE provideQueryClient so its
		// hostConnected (script read) fires before the hydration hostConnected.
		const ts = provideTransferState("hyd-basic");
		const qc = provideQueryClient({ withHydration: ts });
		host.connect();

		expect(qc.getQueryData(["posts"])).toStrictEqual(serverData);
	});

	it("script tag is removed after hydration", () => {
		using host = new EventTestHost();
		const serverQc = new QueryClient();
		serverQc.setQueryData(["item"], { v: 42 });
		const script = makeMockScript("hyd-remove", { state: dehydrate(serverQc) });
		serverQc.clear();
		attachShadowRoot(host, script);

		const ts = provideTransferState("hyd-remove");
		provideQueryClient({ withHydration: ts });
		host.connect();

		expect(script.remove).toHaveBeenCalledOnce();
	});

	it("useQuery returns cached data immediately after hydration — no additional fetch", async () => {
		using host = new EventTestHost();
		const serverData = [{ id: 2, title: "Hydrated" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		const script = makeMockScript("hyd-usequery", { state: dehydrate(serverQc) });
		serverQc.clear();
		attachShadowRoot(host, script);

		// Registration order matters: transfer state → QueryClient (hydrate) → useQuery (observe)
		const ts = provideTransferState("hyd-usequery");
		const qc = provideQueryClient({ withHydration: ts });
		const query = useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]) }, qc);
		host.connect();
		await host.willLoad();

		expect(query().data).toStrictEqual(serverData);
		expect(query().isSuccess).toBeTruthy();
	});

	it("no withHydration: backward-compatible, no errors", () => {
		using host = new EventTestHost();
		attachShadowRoot(host, null);

		provideQueryClient();
		host.connect();

		// Must not throw — backward-compatible with no hydration
		expect(true).toBeTruthy();
	});
});
