import { createContext, provideContext, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { mount } from "@ssv/stencil-core/testing";
import { mountDom } from "@ssv/stencil-core/testing/dom";
import type { DomTestMode } from "@ssv/stencil-core/testing/dom";
import { scriptId } from "@ssv/stencil-core/transfer-state";
import { Build } from "@stencil/core";
import { QueryClient, dehydrate } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SSR_STALE_TIME, provideQueryClient, useQueryClient } from "./query-client-context";

/**
 * A custom context key simulating a feature-scoped QueryClient
 * (e.g. a secondary client used alongside the primary one).
 */
const secondaryClientKey = createContext<QueryClient>(undefined, { name: "secondary-client" });

const connectModes = [
	{ label: "top-down", mode: "default" as DomTestMode },
	{ label: "bottom-up", mode: "hydrate" as DomTestMode },
];

// ── MockScript helpers (mirrors use-query-hydration.spec.ts) ─────────────────

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

function decodeSsrScript(content: string): string {
	return content.replaceAll(/\\u(?<hex>[0-9a-fA-F]{4})/gu, (_, hex: string) =>
		String.fromCodePoint(Number.parseInt(hex, 16)),
	);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("query-client-context", () => {
	let primaryClient: QueryClient;
	let secondaryClient: QueryClient;

	beforeEach(() => {
		primaryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		secondaryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("provideQueryClient / useQueryClient", () => {
		it.each(connectModes)("$label: child resolves the provided client", async ({ mode }) => {
			let ref!: Ref<QueryClient>;
			using _tree = await mountDom(
				n => {
					provideQueryClient({ client: primaryClient });
					n.child(() => {
						ref = useQueryClient();
					});
				},
				{ mode },
			);

			expect(ref.current).toBe(primaryClient);
		});
	});

	describe("multiple independent clients via separate context keys", () => {
		it.each(connectModes)("$label: each key independently resolves its own provided client", async ({ mode }) => {
			let primaryRef!: Ref<QueryClient>;
			let secondaryRef!: Ref<QueryClient>;
			using _tree = await mountDom(
				n => {
					provideQueryClient({ client: primaryClient });
					provideContext(secondaryClientKey, secondaryClient);
					n.child(() => {
						primaryRef = useQueryClient();
						secondaryRef = useContext(secondaryClientKey);
					});
				},
				{ mode },
			);

			expect(primaryRef.current).toBe(primaryClient);
			expect(secondaryRef.current).toBe(secondaryClient);
			expect(primaryRef.current).not.toBe(secondaryRef.current);
		});

		it.each(connectModes)(
			"$label: registering a secondary client via a custom key does not override queryClientKey",
			async ({ mode }) => {
				let primaryRef!: Ref<QueryClient>;
				let secondaryRef!: Ref<QueryClient>;
				using _tree = await mountDom(
					n => {
						provideQueryClient({ client: primaryClient });
						provideContext(secondaryClientKey, secondaryClient);
						n.child(() => {
							primaryRef = useQueryClient();
							secondaryRef = useContext(secondaryClientKey);
						});
					},
					{ mode },
				);

				// useQueryClient() must still resolve the primary — secondaryKey must never
				// touch queryClientKey
				expect(primaryRef.current).toBe(primaryClient);
				expect(secondaryRef.current).not.toBe(primaryClient);
			},
		);
	});

	// ── provideQueryClient({ hydrate }) ───────────────────────────────────────

	describe("provideQueryClient({ hydrate })", () => {
		beforeEach(() => {
			vi.stubGlobal("window", {});
		});

		it("auto-created client has staleTime === DEFAULT_SSR_STALE_TIME when hydrate is true", async () => {
			const script = makeMockScript("hyd-stale", {});
			let qc!: QueryClient;

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				qc = provideQueryClient({ hydrate: true });
			});

			expect(qc.getDefaultOptions().queries?.staleTime).toBe(DEFAULT_SSR_STALE_TIME);
		});

		it("custom staleTime is honored when hydrate is true", async () => {
			const script = makeMockScript("hyd-custom-stale", {});
			let qc!: QueryClient;

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				qc = provideQueryClient({ hydrate: true, staleTime: 999 });
			});

			expect(qc.getDefaultOptions().queries?.staleTime).toBe(999);
		});

		it("explicit client is not mutated — staleTime unchanged", async () => {
			const script = makeMockScript("hyd-explicit-client", {});
			const explicitClient = new QueryClient({ defaultOptions: { queries: { staleTime: 0 } } });

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				provideQueryClient({ client: explicitClient, hydrate: true });
			});

			// staleTime should remain 0 — we must not mutate an explicitly-provided client
			expect(explicitClient.getDefaultOptions().queries?.staleTime).toBe(0);
		});

		it("end-to-end: server serializes cache, client hydrates from it", async () => {
			// Server phase: seed data and dehydrate it.
			const serverQc = new QueryClient();
			serverQc.setQueryData(["e2e-posts"], [{ id: 1, title: "E2E post" }]);
			const serverDehydrated = dehydrate(serverQc);
			serverQc.clear();

			const script = makeMockScript("query", { __tsq: serverDehydrated });
			let qc!: QueryClient;

			using _m = await mount(h => {
				attachShadowRoot(h, script);
				qc = provideQueryClient({ hydrate: true });
			});

			expect(qc.getQueryData(["e2e-posts"])).toStrictEqual([{ id: 1, title: "E2E post" }]);
		});

		it("server phase: serializes QueryClient cache into transfer-state script", async () => {
			Object.assign(Build, { isServer: true });
			try {
				const script = makeMockScript("query", {});

				using _m = await mount(h => {
					attachShadowRoot(h, script);
					const qc = provideQueryClient({ hydrate: true });
					qc.setQueryData(["ssr-item"], { v: 1 });
				});

				const stored = JSON.parse(decodeSsrScript(script.textContent)) as Record<
					string,
					{ queries: { queryKey: unknown }[] }
				>;
				expect(stored.__tsq.queries.map(q => q.queryKey)).toContainEqual(["ssr-item"]);
			} finally {
				Object.assign(Build, { isServer: false });
			}
		});

		it("without hydrate — no staleTime set on auto-created client", async () => {
			let qc!: QueryClient;

			using _m = await mount(() => {
				qc = provideQueryClient();
			});

			expect(qc.getDefaultOptions().queries?.staleTime).toBeUndefined();
		});
	});
});
