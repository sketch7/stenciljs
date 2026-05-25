import { DomTestHost } from "@ssv/stencil-core/testing/dom";
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
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearCurrentHost } from "../../src/hooks/host-context";

import type { ContextRef } from "#lib";
import { createContext, provideContext, useContext } from "#lib";

// ── Context fixtures ──────────────────────────────────────────────────────────

/** No default factory — mirrors QueryClient (must have a provider ancestor). */
const NoDefaultCtx = createContext<{ id: number }>(undefined, { name: "no-default" });

/** Has a default factory — mirrors a context that can fall back to a singleton. */
const WithDefaultCtx = createContext<{ id: number }>(() => ({ id: -1 }), { name: "with-default" });

// ── Connection order helpers ──────────────────────────────────────────────────

type ConnectFn = (provider: DomTestHost, consumer: DomTestHost) => void;

/** Provider connects first — mirrors SSR render and client navigation. */
const connectTopDown: ConnectFn = (provider, consumer) => {
	provider.connect();
	consumer.connect();
};

/** Consumer connects first — mirrors SSR→client DSD hydration. */
const connectBottomUp: ConnectFn = (provider, consumer) => {
	// Simulate SSR hydration: Stencil sets the `s-id` JS property on each component
	// before lifecycle hooks fire (the DOM attribute is removed earlier, but the property persists).
	(provider as unknown as Record<string, unknown>)["s-id"] = "1";
	(consumer as unknown as Record<string, unknown>)["s-id"] = "2";
	consumer.connect();
	provider.connect();
};

const connectOrders = [
	{ label: "top-down", connect: connectTopDown },
	{ label: "bottom-up", connect: connectBottomUp },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("context-resolution", () => {
	describe("no-default-factory context (e.g. QueryClient)", () => {
		let providerEl: DomTestHost;
		let consumerEl: DomTestHost;
		let providerValue: { id: number };
		let ref: ContextRef<{ id: number }>;

		beforeEach(() => {
			providerEl = new DomTestHost();
			providerValue = provideContext(NoDefaultCtx, { id: 42 });

			consumerEl = new DomTestHost();
			ref = useContext(NoDefaultCtx);
			clearCurrentHost();

			// Consumer is a DOM descendant of provider — enables CONTEXT_EVENT bubbling.
			providerEl.append(consumerEl);
			document.body.append(providerEl);
		});

		afterEach(() => {
			providerEl.remove();
		});

		it.each(connectOrders)("$label: resolves to provider value", ({ connect }) => {
			connect(providerEl, consumerEl);

			expect(ref.current).toStrictEqual(providerValue);
		});

		it.each(connectOrders)("$label: willLoad is a no-op after both connected", async ({ connect }) => {
			connect(providerEl, consumerEl);
			await consumerEl.willLoad();

			expect(ref.current).toStrictEqual(providerValue);
		});

		it("no provider: willLoad throws a descriptive [ssv:context] error", async () => {
			const standaloneEl = new DomTestHost();
			useContext(NoDefaultCtx);
			clearCurrentHost();
			document.body.append(standaloneEl);

			standaloneEl.connect();
			await expect(standaloneEl.willLoad()).rejects.toThrow("[ssv:context]");

			standaloneEl.disconnect();
			standaloneEl.remove();
		});
	});

	describe("default-factory context (singleton fallback)", () => {
		it("no provider: falls back to singleton after willLoad", async () => {
			const el = new DomTestHost();
			const ref = useContext(WithDefaultCtx);
			clearCurrentHost();
			document.body.append(el);

			el.connect();
			await el.willLoad();
			expect(ref.current).toStrictEqual({ id: -1 });

			el.disconnect();
			el.remove();
		});

		it("two standalone consumers share the same singleton instance", async () => {
			const el1 = new DomTestHost();
			const ref1 = useContext(WithDefaultCtx);

			const el2 = new DomTestHost();
			const ref2 = useContext(WithDefaultCtx);
			clearCurrentHost();

			document.body.append(el1, el2);
			el1.connect();
			el2.connect();
			await Promise.all([el1.willLoad(), el2.willLoad()]);

			expect(ref1.current).toBe(ref2.current);

			el1.disconnect();
			el2.disconnect();
			el1.remove();
			el2.remove();
		});

		it.each(connectOrders)("$label: provider value wins over singleton default", async ({ connect }) => {
			const providerEl = new DomTestHost();
			const providerValue = { id: 99 };
			provideContext(WithDefaultCtx, providerValue);

			const consumerEl = new DomTestHost();
			const ref = useContext(WithDefaultCtx);
			clearCurrentHost();

			providerEl.append(consumerEl);
			document.body.append(providerEl);

			connect(providerEl, consumerEl);
			await consumerEl.willLoad();

			expect(ref.current).toBe(providerValue);

			consumerEl.disconnect();
			providerEl.disconnect();
			providerEl.remove();
		});
	});
});
