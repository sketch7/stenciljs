import { TestHost, mount } from "@ssv/stencil-core/testing";
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
		const source = new QueryClient();
		source.setQueryData(["posts"], [{ id: 1, title: "SSR post" }]);
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		hydrate(target, state);

		using m = await mount(() => ({
			query: useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]), staleTime: Infinity }, target),
		}));

		expect(m.query().data).toStrictEqual([{ id: 1, title: "SSR post" }]);
		expect(m.query().isSuccess).toBeTruthy();
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

	it("provideQueryClient hydrates the QueryClient from the transfer state on connect", async () => {
		const serverData = [{ id: 1, title: "SSR post" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		// DEHYDRATED_KEY = makeTransferKey("state") = "state"
		const script = makeMockScript("hyd-basic", { state: dehydrate(serverQc) });
		serverQc.clear();

		// provideTransferState must be registered BEFORE provideQueryClient so its
		// hostConnected (script read) fires before the hydration hostConnected.
		using m = await mount(
			h => {
				attachShadowRoot(h, script);
				const ts = provideTransferState("hyd-basic");
				return { qc: provideQueryClient({ withHydration: ts }) };
			},
			{ hostFactory: () => new EventTestHost() },
		);

		expect(m.qc.getQueryData(["posts"])).toStrictEqual(serverData);
	});

	it("script tag is removed after hydration", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["item"], { v: 42 });
		const script = makeMockScript("hyd-remove", { state: dehydrate(serverQc) });
		serverQc.clear();

		using _m = await mount(
			h => {
				attachShadowRoot(h, script);
				const ts = provideTransferState("hyd-remove");
				provideQueryClient({ withHydration: ts });
			},
			{ hostFactory: () => new EventTestHost() },
		);

		expect(script.remove).toHaveBeenCalledOnce();
	});

	it("useQuery returns cached data immediately after hydration — no additional fetch", async () => {
		const serverData = [{ id: 2, title: "Hydrated" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		const script = makeMockScript("hyd-usequery", { state: dehydrate(serverQc) });
		serverQc.clear();

		// Registration order matters: transfer state → QueryClient (hydrate) → useQuery (observe)
		using m = await mount(
			h => {
				attachShadowRoot(h, script);
				const ts = provideTransferState("hyd-usequery");
				const qc = provideQueryClient({ withHydration: ts });
				return {
					query: useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]), staleTime: Infinity }, qc),
				};
			},
			{ hostFactory: () => new EventTestHost() },
		);

		expect(m.query().data).toStrictEqual(serverData);
		expect(m.query().isSuccess).toBeTruthy();
	});

	it("no withHydration: backward-compatible, no errors", async () => {
		using _m = await mount(
			h => {
				attachShadowRoot(h, null);
				provideQueryClient();
			},
			{ hostFactory: () => new EventTestHost() },
		);

		// Must not throw — backward-compatible with no hydration
		expect(true).toBeTruthy();
	});
});
