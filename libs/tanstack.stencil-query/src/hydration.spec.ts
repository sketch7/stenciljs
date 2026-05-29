import { mount } from "@ssv/stencil-core/testing";
import { QueryClient, dehydrate, hydrate } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";

import { useQuery } from "./use-query";

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

		expect(target.getQueryData(["item"])).toBe("fresh");
	});
});
