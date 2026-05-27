import { DomTestHost, mountDom } from "@ssv/stencil-core/testing/dom";
import type { DomTestMode } from "@ssv/stencil-core/testing/dom";
/**
 * Context resolution order tests.
 *
 * Tests the three real-world initialization orderings Stencil produces:
 *   - top-down  (SSR render, client navigation)         → provider connects first
 *   - bottom-up (SSR→client DSD hydration)              → consumer connects first
 *   - no-provider                                        → singleton fallback or error
 *
 * Uses `DomTestHost` (real HTMLElement) instead of compiled Stencil components so
 * that lifecycle methods can be driven manually in any order — confirming pure
 * controller logic without depending on Stencil's top-down async scheduler.
 *
 * Event bubbling works because `DomTestHost` elements are real DOM nodes in JSDOM
 * and `consumerEl` is a descendant of `providerEl`.
 */
import { describe, expect, it } from "vitest";

import { clearCurrentHost } from "../../src/hooks/host-context";

import type { ContextRef } from "#lib";
import { createContext, provideContext, useContext } from "#lib";

// ── Context fixtures ──────────────────────────────────────────────

/** No default factory — mirrors QueryClient (must have a provider ancestor). */
const NoDefaultCtx = createContext<{ id: number }>(undefined, { name: "no-default" });

/** Has a default factory — mirrors a context that can fall back to a singleton. */
const WithDefaultCtx = createContext<{ id: number }>(() => ({ id: -1 }), { name: "with-default" });

const connectModes = [
	{ label: "top-down", mode: "default" as DomTestMode },
	{ label: "bottom-up", mode: "hydrate" as DomTestMode },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("context-resolution", () => {
	describe("no-default-factory context (e.g. QueryClient)", () => {
		it.each(connectModes)("$label: resolves to provider value", async ({ mode }) => {
			let ref!: ContextRef<{ id: number }>;
			using tree = await mountDom(
				n => {
					const providerValue = provideContext(NoDefaultCtx, { id: 42 });
					n.child(() => {
						ref = useContext(NoDefaultCtx);
					});
					return providerValue;
				},
				{ mode },
			);

			expect(ref.current).toStrictEqual(tree.result);
		});

		it.each(connectModes)("$label: willLoad is a no-op after both connected", async ({ mode }) => {
			let ref!: ContextRef<{ id: number }>;
			let consumerHost!: DomTestHost;
			using _tree = await mountDom(
				n => {
					provideContext(NoDefaultCtx, { id: 42 });
					n.child(c => {
						ref = useContext(NoDefaultCtx);
						consumerHost = c.host;
					});
				},
				{ mode },
			);

			await consumerHost.willLoad();

			expect(ref.current).toStrictEqual({ id: 42 });
		});

		it("no provider: willLoad throws a descriptive [ssv:context] error", async () => {
			using host = new DomTestHost();
			useContext(NoDefaultCtx);
			clearCurrentHost();
			document.body.append(host);

			host.connect();
			await expect(host.willLoad()).rejects.toThrow("[ssv:context]");
		});
	});

	describe("default-factory context (singleton fallback)", () => {
		it("no provider: falls back to singleton after willLoad", async () => {
			let ref!: ContextRef<{ id: number }>;
			using _tree = await mountDom(() => {
				ref = useContext(WithDefaultCtx);
			});
			expect(ref.current).toStrictEqual({ id: -1 });
		});

		it("two standalone consumers share the same singleton instance", async () => {
			let r1!: ContextRef<{ id: number }>, r2!: ContextRef<{ id: number }>;
			using _tree = await mountDom(root => {
				root.child(() => {
					r1 = useContext(WithDefaultCtx);
				});
				root.child(() => {
					r2 = useContext(WithDefaultCtx);
				});
			});

			expect(r1.current).toBe(r2.current);
		});

		it.each(connectModes)("$label: provider value wins over singleton default", async ({ mode }) => {
			let ref!: ContextRef<{ id: number }>;
			const providerValue = { id: 99 };
			using _tree = await mountDom(
				n => {
					provideContext(WithDefaultCtx, providerValue);
					n.child(() => {
						ref = useContext(WithDefaultCtx);
					});
				},
				{ mode },
			);

			expect(ref.current).toBe(providerValue);
		});
	});
});
