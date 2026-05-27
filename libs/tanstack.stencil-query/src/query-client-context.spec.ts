import { createContext, provideContext, useContext } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { mountDom } from "@ssv/stencil-core/testing/dom";
import type { DomTestMode } from "@ssv/stencil-core/testing/dom";
import { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, it } from "vitest";

import { provideQueryClient, useQueryClient } from "./query-client-context";

/**
 * A custom context key simulating a feature-scoped QueryClient
 * (e.g. a secondary client used alongside the primary one).
 */
const secondaryClientKey = createContext<QueryClient>(undefined, { name: "secondary-client" });

const connectModes = [
	{ label: "top-down", mode: "default" as DomTestMode },
	{ label: "bottom-up", mode: "hydrate" as DomTestMode },
];

describe("query-client-context", () => {
	let primaryClient: QueryClient;
	let secondaryClient: QueryClient;

	beforeEach(() => {
		primaryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		secondaryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
