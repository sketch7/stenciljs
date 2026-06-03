// oxlint-disable import/max-dependencies
import type { Ref } from "@ssv/stencil-core";
import { mount } from "@ssv/stencil-core/testing";
import { mountDom } from "@ssv/stencil-core/testing/dom";
import type { DomTestMode } from "@ssv/stencil-core/testing/dom";
import { provideTransferState, scriptId } from "@ssv/stencil-core/transfer-state";
import { Build } from "@stencil/core";
import { QueryClient, dehydrate } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provideQueryClient, useQueryClient } from "./query-client-context";
import { usePrefetchQuery } from "./use-prefetch-query";
import { useQuery } from "./use-query";
import { useQueryHydration } from "./use-query-hydration";

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

function attachShadowRoot(host: object, script: MockScript | null): void {
	(host as Record<string, unknown>).shadowRoot = {
		querySelector: (sel: string) => (script && sel === `#${script.id}` ? script : null),
	};
}

/**
 * `toJSON()` produces template-literal-safe JSON: backslashes and other chars
 * are encoded as `\uXXXX` so they survive `@stencil/ssr`'s template literal
 * embedding. This helper reverses that encoding to let tests call `JSON.parse`
 * directly, mirroring what the browser sees after the template literal step.
 */
function decodeSsrScript(content: string): string {
	return content.replaceAll(/\\u(?<hex>[0-9a-fA-F]{4})/gu, (_, hex: string) =>
		String.fromCodePoint(Number.parseInt(hex, 16)),
	);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("useQueryHydration", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("is a no-op when the transfer state has no data for the key", async () => {
		const qc = new QueryClient();
		const script = makeMockScript("hyd-noop", {});

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-noop");
			useQueryHydration({ client: qc });
		});

		expect(qc.getQueryCache().getAll()).toHaveLength(0);
	});

	it("hydrates the QueryClient from transfer state on connect", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], [{ id: 1 }]);
		const script = makeMockScript("hyd-connect", { __tsq: dehydrate(serverQc) });
		serverQc.clear();

		const qc = new QueryClient();

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-connect");
			useQueryHydration({ client: qc });
		});

		expect(qc.getQueryData(["posts"])).toStrictEqual([{ id: 1 }]);
	});

	it("script tag is removed after the transfer state is read", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["item"], { v: 42 });
		const script = makeMockScript("hyd-remove", { __tsq: dehydrate(serverQc) });
		serverQc.clear();

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-remove");
			useQueryHydration({ client: new QueryClient() });
		});

		expect(script.remove).toHaveBeenCalledOnce();
	});

	it("hydrates from the context QueryClient when no client option is provided", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["items"], [{ id: 2 }]);
		const script = makeMockScript("hyd-ctx-client", { __tsq: dehydrate(serverQc) });
		serverQc.clear();

		using m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-ctx-client");
			const qc = provideQueryClient();
			useQueryHydration();
			return { qc };
		});

		expect(m.qc.getQueryData(["items"])).toStrictEqual([{ id: 2 }]);
	});

	it("useQuery returns cached data immediately after hydration — no additional fetch", async () => {
		const serverData = [{ id: 3, title: "Hydrated post" }];
		const serverQc = new QueryClient();
		serverQc.setQueryData(["posts"], serverData);
		const script = makeMockScript("hyd-usequery", { __tsq: dehydrate(serverQc) });
		serverQc.clear();

		const qc = new QueryClient();

		using m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-usequery");
			useQueryHydration({ client: qc });
			return {
				query: useQuery({ queryKey: ["posts"], queryFn: async () => [], staleTime: Infinity }, qc),
			};
		});

		expect(m.query().data).toStrictEqual(serverData);
		expect(m.query().isSuccess).toBeTruthy();
	});

	it("uses a custom key when the key option is provided", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["users"], [{ id: 10 }]);
		const script = makeMockScript("hyd-custom-key", { "__tsq-users": dehydrate(serverQc) });
		serverQc.clear();

		const qc = new QueryClient();

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-custom-key");
			useQueryHydration({ client: qc, key: "users" });
		});

		expect(qc.getQueryData(["users"])).toStrictEqual([{ id: 10 }]);
	});

	it("scopes two QueryClients independently with different keys", async () => {
		const serverPosts = new QueryClient();
		serverPosts.setQueryData(["posts"], [{ id: 1 }]);
		const serverUsers = new QueryClient();
		serverUsers.setQueryData(["users"], [{ id: 10 }]);
		const script = makeMockScript("hyd-multi", {
			"__tsq-posts": dehydrate(serverPosts),
			"__tsq-users": dehydrate(serverUsers),
		});
		serverPosts.clear();
		serverUsers.clear();

		const qcPosts = new QueryClient();
		const qcUsers = new QueryClient();

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-multi");
			useQueryHydration({ client: qcPosts, key: "posts" });
			useQueryHydration({ client: qcUsers, key: "users" });
		});

		expect(qcPosts.getQueryData(["posts"])).toStrictEqual([{ id: 1 }]);
		expect(qcUsers.getQueryData(["users"])).toStrictEqual([{ id: 10 }]);
	});

	it("does not overwrite newer client data with older dehydrated data", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["item"], "stale");
		const dehydrated = dehydrate(serverQc);
		serverQc.clear();

		// Set fresh data AFTER dehydrating server state — client timestamp is newer.
		const qc = new QueryClient();
		qc.setQueryData(["item"], "fresh");
		const script = makeMockScript("hyd-no-overwrite", { __tsq: dehydrated });

		using _m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-no-overwrite");
			useQueryHydration({ client: qc });
		});

		expect(qc.getQueryData(["item"])).toBe("fresh");
	});

	it("accepts a Ref<QueryClient> as the client option", async () => {
		const serverQc = new QueryClient();
		serverQc.setQueryData(["items"], [{ id: 9 }]);
		const script = makeMockScript("hyd-ref-client", { __tsq: dehydrate(serverQc) });
		serverQc.clear();

		const qc = new QueryClient();

		using m = await mount(h => {
			attachShadowRoot(h, script);
			provideTransferState("hyd-ref-client");
			const clientRef = useQueryClient(qc); // wraps bare QueryClient in a Ref
			useQueryHydration({ client: clientRef });
			return { qc };
		});

		expect(m.qc.getQueryData(["items"])).toStrictEqual([{ id: 9 }]);
	});

	describe("server-side serialization", () => {
		beforeEach(() => {
			Object.assign(Build, { isServer: true });
		});

		afterEach(() => {
			Object.assign(Build, { isServer: false });
		});

		it("serializes the QueryClient cache into the transfer-state script on didLoad", async () => {
			const qc = new QueryClient();
			qc.setQueryData(["posts"], [{ id: 1, title: "SSR post" }]);
			const script = makeMockScript("hyd-server", {});

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideTransferState("hyd-server");
				useQueryHydration({ client: qc });
			});

			const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<
				string,
				{ queries: { queryKey: unknown }[] }
			>;
			expect(stored.__tsq.queries).toHaveLength(1);
			expect(stored.__tsq.queries[0].queryKey).toStrictEqual(["posts"]);
		});

		it("uses a custom transfer-state key when the key option is provided", async () => {
			const qc = new QueryClient();
			qc.setQueryData(["users"], [{ id: 10 }]);
			const script = makeMockScript("hyd-server-key", {});

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideTransferState("hyd-server-key");
				useQueryHydration({ client: qc, key: "users" });
			});

			const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<
				string,
				{ queries: unknown[] } | undefined
			>;
			expect(stored["__tsq-users"]?.queries).toHaveLength(1);
			expect(stored.__tsq).toBeUndefined();
		});

		it("serializes an empty cache", async () => {
			const qc = new QueryClient();
			const script = makeMockScript("hyd-server-empty", {});

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideTransferState("hyd-server-empty");
				useQueryHydration({ client: qc });
			});

			const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<string, { queries: unknown[] }>;
			expect(stored.__tsq.queries).toHaveLength(0);
		});

		it("serializes all queries in the cache", async () => {
			const qc = new QueryClient();
			qc.setQueryData(["posts"], [{ id: 1 }]);
			qc.setQueryData(["users"], [{ id: 10 }]);
			const script = makeMockScript("hyd-server-multi", {});

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideTransferState("hyd-server-multi");
				useQueryHydration({ client: qc });
			});

			const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<
				string,
				{ queries: { queryKey: unknown }[] }
			>;
			const queryKeys = stored.__tsq.queries.map(q => q.queryKey);
			expect(queryKeys).toStrictEqual(expect.arrayContaining([["posts"], ["users"]]));
		});

		it("serializes cache populated by usePrefetchQuery during hostWillLoad", async () => {
			const qc = new QueryClient();
			const script = makeMockScript("hyd-prefetch-server", {});

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideTransferState("hyd-prefetch-server");
				// prefetchQuery runs in hostWillLoad (awaited by mount before hostDidLoad)
				usePrefetchQuery({ queryKey: ["items"], queryFn: async () => [{ id: 42 }] }, qc);
				// setLazy fires in hostDidLoad — after prefetch has completed
				useQueryHydration({ client: qc });
			});

			const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<
				string,
				{ queries: { queryKey: unknown }[] }
			>;
			expect(stored.__tsq.queries[0].queryKey).toStrictEqual(["items"]);
		});
	});

	describe("cross-component context via mountDom", () => {
		const connectModes = [
			{ label: "top-down", mode: "default" as DomTestMode },
			{ label: "bottom-up", mode: "hydrate" as DomTestMode },
		];

		it.each(connectModes)(
			"$label: hydrates root QueryClient; child components resolve it from context",
			async ({ mode }) => {
				const serverQc = new QueryClient();
				serverQc.setQueryData(["items"], [{ id: 5 }]);
				const script = makeMockScript("hyd-dom", { __tsq: dehydrate(serverQc) });
				serverQc.clear();

				const qc = new QueryClient();
				let childClientRef!: Ref<QueryClient>;

				using _tree = await mountDom(
					root => {
						// Inject dehydrated data into the root host's shadow root for reading.
						Object.defineProperty(root.host, "shadowRoot", {
							configurable: true,
							get: () => ({
								querySelector: (sel: string) => (sel === `#${script.id}` ? script : null),
							}),
						});
						provideQueryClient({ client: qc });
						provideTransferState("hyd-dom");
						useQueryHydration(); // same-element context — works in all connect modes

						root.child(() => {
							// Child receives the hydrated QueryClient via context.
							childClientRef = useQueryClient();
						});
					},
					{ mode },
				);

				expect(childClientRef.current).toBe(qc);
				expect(qc.getQueryData(["items"])).toStrictEqual([{ id: 5 }]);
			},
		);
	});
});
