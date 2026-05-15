import { TestHost } from "@ssv/stencil.core/testing";
import { QueryClient, dehydrate, hydrate } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provideQueryClient } from "./query-client-context";
import { useQuery } from "./use-query";

describe("hydration", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		host.dispose();
	});

	it("dehydrate captures query state", async () => {
		const qc = new QueryClient();
		await qc.prefetchQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([{ id: 1, title: "Hello" }]) });

		const state = dehydrate(qc);

		expect(state.queries).toHaveLength(1);
		expect(state.queries[0].queryKey).toStrictEqual(["posts"]);
		qc.clear();
	});

	it("hydrate restores query state into a fresh client", async () => {
		const source = new QueryClient();
		await source.prefetchQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([{ id: 1 }]) });
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		hydrate(target, state);

		expect(target.getQueryData(["posts"])).toStrictEqual([{ id: 1 }]);
		target.clear();
	});

	it("hydrated client returns data immediately without fetch in useQuery", () => {
		const source = new QueryClient();
		source.setQueryData(["posts"], [{ id: 1, title: "SSR post" }]);
		const state = dehydrate(source);
		source.clear();

		const target = new QueryClient();
		hydrate(target, state);

		const query = useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]) }, target);
		host.connect();

		expect(query.data).toStrictEqual([{ id: 1, title: "SSR post" }]);
		expect(query.isSuccess).toBeTruthy();
		target.clear();
	});

	it("dehydrate excludes queries that have not been fetched", () => {
		const qc = new QueryClient();
		const state = dehydrate(qc);
		expect(state.queries).toHaveLength(0);
		qc.clear();
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
		target.clear();
	});
});

// ── provideQueryClient({ ssrKey }) transfer-state integration ─────────────────
describe("provideQueryClient SSR transfer state", () => {
	type MockScript = { type: string; id: string; textContent: string; remove: ReturnType<typeof vi.fn> };

	function createMockDocument() {
		const scripts = new Map<string, MockScript>();
		const createElement = vi.fn<(tag: string) => MockScript>(_tag => ({
			type: "",
			id: "",
			textContent: "",
			remove: vi.fn<() => void>(),
		}));
		const head = { append: vi.fn<(s: MockScript) => void>(s => scripts.set(s.id, s)) };
		const querySelector = vi.fn<(selector: string) => MockScript | null>(selector => {
			const id = selector.startsWith("#") ? selector.slice(1) : selector;
			return scripts.get(id) ?? null;
		});
		return { head, createElement, querySelector, scripts };
	}

	// provideContext calls host.addEventListener — TestHost needs to support it.
	class EventTestHost extends TestHost {
		addEventListener = vi.fn<() => void>();
		removeEventListener = vi.fn<() => void>();
		dispatchEvent = vi.fn<() => boolean>();
	}

	let host: EventTestHost;
	let mockDoc: ReturnType<typeof createMockDocument>;

	beforeEach(() => {
		host = new EventTestHost();
		mockDoc = createMockDocument();
		(globalThis as Record<string, unknown>)["document"] = mockDoc;
	});

	afterEach(() => {
		host.dispose();
		vi.unstubAllGlobals();
		delete (globalThis as Record<string, unknown>)["document"];
	});

	it("server: injects dehydrated QueryClient into document.head on first render", async () => {
		vi.stubGlobal("requestAnimationFrame", undefined);

		const qc = provideQueryClient({ ssrKey: "posts-test" });
		await qc.prefetchQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([{ id: 1 }]) });

		host.render();

		expect(mockDoc.head.append).toHaveBeenCalledTimes(1);
		const injected = [...mockDoc.scripts.values()][0];
		expect(injected.id).toBe("ssv-ts-tanstack-query-posts-test");
		expect(injected.type).toBe("application/json");

		const state = JSON.parse(injected.textContent);
		expect(state.queries).toHaveLength(1);
		expect(state.queries[0].queryKey).toStrictEqual(["posts"]);
		qc.clear();
	});

	it("client: hydrates QueryClient from script tag before observer subscribes", () => {
		vi.stubGlobal("requestAnimationFrame", vi.fn<() => number>());

		const serverData = [{ id: 1, title: "SSR post" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		const serialized = JSON.stringify(dehydrate(serverQc));
		serverQc.clear();

		const scriptEl: MockScript = {
			type: "application/json",
			id: "ssv-ts-tanstack-query-posts-client",
			textContent: serialized,
			remove: vi.fn<() => void>(),
		};
		mockDoc.scripts.set("ssv-ts-tanstack-query-posts-client", scriptEl);

		const qc = provideQueryClient({ ssrKey: "posts-client" });
		host.connect();

		expect(qc.getQueryData(["posts"])).toStrictEqual(serverData);
		expect(scriptEl.remove).toHaveBeenCalledTimes(1);
		qc.clear();
	});

	it("client: useQuery returns cached data immediately after hydration (no fetch)", () => {
		vi.stubGlobal("requestAnimationFrame", vi.fn<() => number>());

		const serverData = [{ id: 1, title: "SSR post" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		const serialized = JSON.stringify(dehydrate(serverQc));
		serverQc.clear();

		const scriptEl: MockScript = {
			type: "application/json",
			id: "ssv-ts-tanstack-query-posts-no-fetch",
			textContent: serialized,
			remove: vi.fn<() => void>(),
		};
		mockDoc.scripts.set("ssv-ts-tanstack-query-posts-no-fetch", scriptEl);

		// Controllers registered in order: provideQueryClient (transfer state + hydration) → useQuery
		// hostConnected fires in that same order, so hydration precedes observer creation.
		const qc = provideQueryClient({ ssrKey: "posts-no-fetch" });
		const query = useQuery({ queryKey: ["posts"], queryFn: () => Promise.resolve([]) }, qc);
		host.connect();

		expect(query.data).toStrictEqual(serverData);
		expect(query.isSuccess).toBeTruthy();
		qc.clear();
	});

	it("no ssrKey: backward-compatible, no script tag interaction", () => {
		vi.stubGlobal("requestAnimationFrame", vi.fn<() => number>());

		provideQueryClient();
		host.connect();
		host.render();

		expect(mockDoc.head.append).not.toHaveBeenCalled();
		expect(mockDoc.querySelector).not.toHaveBeenCalled();
	});
});
