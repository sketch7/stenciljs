/**
 * Context resolution order tests.
 *
 * Tests the three real-world initialization orderings Stencil produces:
 *   - top-down  (SSR render, client navigation)         → provider connects first
 *   - bottom-up (SSR→client DSD hydration)              → consumer connects first
 *   - no-provider                                        → singleton fallback or error
 *
 * Uses augmented HTMLDivElement hosts instead of compiled Stencil components so
 * that `setCurrentHost` / lifecycle methods can be driven manually — confirming
 * pure controller logic without depending on Stencil's async scheduler timing.
 *
 * Event bubbling works because the div elements are real DOM nodes in JSDOM and
 * `consumerEl` is a descendant of `providerEl`.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearCurrentHost, setCurrentHost } from "../../src/hooks/host-context";

import type { ContextRef, ReactiveController, ReactiveControllerHost } from "#lib";
import { createContext, provideContext, useContext } from "#lib";

// ── DOM test host ─────────────────────────────────────────────────────────────

type DomHost = HTMLDivElement &
	ReactiveControllerHost & {
		connect(): void;
		disconnect(): void;
		willLoad(): Promise<void>;
		renderCount: number;
	};

function createDomHost(): DomHost {
	const el = document.createElement("div") as DomHost;
	const ctrls = new Set<ReactiveController>();
	el.addController = c => ctrls.add(c);
	el.removeController = c => ctrls.delete(c);
	el.renderCount = 0;
	el.requestUpdate = () => {
		el.renderCount++;
	};
	el.connect = () => ctrls.forEach(c => c.hostConnected?.());
	el.disconnect = () => ctrls.forEach(c => c.hostDisconnected?.());
	el.willLoad = async () => {
		const ps: Promise<void>[] = [];
		ctrls.forEach(c => {
			const r = c.hostWillLoad?.();
			if (r) {
				ps.push(r);
			}
		});
		if (ps.length) {
			await Promise.all(ps);
		}
	};
	return el;
}

// ── Context fixtures ──────────────────────────────────────────────────────────

/** No default factory — mirrors QueryClient (must have a provider ancestor). */
const NoDefaultCtx = createContext<{ id: number }>(undefined, { name: "no-default" });

/** Has a default factory — mirrors a context that can fall back to a singleton. */
const WithDefaultCtx = createContext<{ id: number }>(() => ({ id: -1 }), { name: "with-default" });

// ── Helpers ───────────────────────────────────────────────────────────────────

function asHost(el: DomHost): ReactiveControllerHost {
	return el as unknown as ReactiveControllerHost;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("context-resolution", () => {
	describe("no-default-factory context (e.g. QueryClient)", () => {
		let providerEl: DomHost;
		let consumerEl: DomHost;
		let providerValue: { id: number };
		let ref: ContextRef<{ id: number }>;

		beforeEach(() => {
			providerEl = createDomHost();
			consumerEl = createDomHost();
			// Consumer is a DOM descendant of provider — enables event bubbling.
			providerEl.appendChild(consumerEl);
			document.body.appendChild(providerEl);

			setCurrentHost(asHost(providerEl));
			providerValue = provideContext(NoDefaultCtx, { id: 42 });

			setCurrentHost(asHost(consumerEl));
			ref = useContext(NoDefaultCtx);
			clearCurrentHost();
		});

		afterEach(() => {
			document.body.removeChild(providerEl);
		});

		it("top-down: resolves immediately when provider connects before consumer", () => {
			providerEl.connect(); // registers CONTEXT_EVENT listener
			consumerEl.connect(); // dispatches event → provider catches → resolved

			expect(ref.current).toEqual(providerValue);
		});

		// RED test — fails with the hostWillLoad-only approach because ref.current
		// is still undefined after providerEl.connect(); only hostWillLoad retries
		// and we haven't called willLoad here.
		it("bottom-up: resolved the moment provider connects (no willLoad needed)", () => {
			consumerEl.connect(); // no provider yet → pending
			providerEl.connect(); // broadcasts PROVIDER_CONNECTED_EVENT → consumer resolves

			expect(ref.current).toEqual(providerValue);
		});

		it("bottom-up: willLoad succeeds (and is a no-op) after provider already connected", async () => {
			consumerEl.connect();
			providerEl.connect(); // resolves via window event
			await consumerEl.willLoad(); // must not throw

			expect(ref.current).toEqual(providerValue);
		});

		it("no provider: willLoad throws a descriptive [ssv:context] error", async () => {
			const standaloneEl = createDomHost();
			document.body.appendChild(standaloneEl);

			setCurrentHost(asHost(standaloneEl));
			useContext(NoDefaultCtx);
			clearCurrentHost();

			standaloneEl.connect();
			await expect(standaloneEl.willLoad()).rejects.toThrow("[ssv:context]");

			standaloneEl.disconnect();
			document.body.removeChild(standaloneEl);
		});
	});

	describe("default-factory context (singleton fallback)", () => {
		it("no provider: falls back to singleton", () => {
			const el = createDomHost();
			document.body.appendChild(el);

			setCurrentHost(asHost(el));
			const ref = useContext(WithDefaultCtx);
			clearCurrentHost();

			el.connect();
			expect(ref.current).toEqual({ id: -1 });

			el.disconnect();
			document.body.removeChild(el);
		});

		it("two standalone consumers share the same singleton instance", () => {
			const el1 = createDomHost();
			const el2 = createDomHost();
			document.body.appendChild(el1);
			document.body.appendChild(el2);

			setCurrentHost(asHost(el1));
			const ref1 = useContext(WithDefaultCtx);
			setCurrentHost(asHost(el2));
			const ref2 = useContext(WithDefaultCtx);
			clearCurrentHost();

			el1.connect();
			el2.connect();

			expect(ref1.current).toBe(ref2.current);

			el1.disconnect();
			el2.disconnect();
			document.body.removeChild(el1);
			document.body.removeChild(el2);
		});
	});
});
