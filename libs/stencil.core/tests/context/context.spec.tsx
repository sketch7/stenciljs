import type { ContextRef } from "#lib";
import { h, render } from "@stencil/vitest";
import { describe, expect, it } from "vitest";

import type { TestCtxValue } from "./test-context";

// Test components are registered automatically via vitest-setup.ts (glob: test-*.js).
// No import needed here — JSX tags reference the registered custom elements.

type WithCtxRef = HTMLElement & { ctxRef: ContextRef<TestCtxValue> };
type WithCtxValue = HTMLElement & { ctxValue: TestCtxValue };

describe("context", () => {
	describe("useContext / provideContext", () => {
		it("falls back to the shared singleton when no provider is in the tree", async () => {
			const { root: rootA } = await render(<test-ctx-consumer />);
			const { root: rootB } = await render(<test-ctx-consumer />);

			const a = (rootA as unknown as WithCtxRef).ctxRef.current;
			const b = (rootB as unknown as WithCtxRef).ctxRef.current;

			// Both resolve to the same cached singleton object
			expect(a).toBe(b);
		});

		it("shares the provider instance among all consumers within the same provider", async () => {
			const { root, waitForChanges } = await render(
				<test-ctx-provider>
					<test-ctx-consumer />
					<test-ctx-consumer />
				</test-ctx-provider>,
			);
			await waitForChanges();

			const provider = root as unknown as WithCtxValue;
			const [c1, c2] = Array.from(root.children) as unknown as WithCtxRef[];

			// Consumers receive the provider's instance, not the singleton
			expect(c1.ctxRef.current).toBe(provider.ctxValue);
			expect(c2.ctxRef.current).toBe(provider.ctxValue);
		});

		it("isolates context between separate provider subtrees", async () => {
			const { root: rootA, waitForChanges: waitA } = await render(
				<test-ctx-provider>
					<test-ctx-consumer />
				</test-ctx-provider>,
			);
			const { root: rootB, waitForChanges: waitB } = await render(
				<test-ctx-provider>
					<test-ctx-consumer />
				</test-ctx-provider>,
			);
			await Promise.all([waitA(), waitB()]);

			const providerA = rootA as unknown as WithCtxValue;
			const providerB = rootB as unknown as WithCtxValue;

			expect(providerA.ctxValue).not.toBe(providerB.ctxValue);

			const consumerA = rootA.children[0] as unknown as WithCtxRef;
			const consumerB = rootB.children[0] as unknown as WithCtxRef;

			expect(consumerA.ctxRef.current).toBe(providerA.ctxValue);
			expect(consumerB.ctxRef.current).toBe(providerB.ctxValue);
		});

		it("resolves to the nearest ancestor provider (nested providers)", async () => {
			// Structure: outer-provider > [outer-consumer, inner-provider > inner-consumer]
			const { root, waitForChanges } = await render(
				<test-ctx-provider>
					<test-ctx-consumer />
					<test-ctx-provider>
						<test-ctx-consumer />
					</test-ctx-provider>
				</test-ctx-provider>,
			);
			await waitForChanges();

			const outerProvider = root as unknown as WithCtxValue;
			const outerConsumer = root.children[0] as unknown as WithCtxRef;
			const innerProvider = root.children[1] as unknown as WithCtxValue;
			const innerConsumer = innerProvider.children[0] as unknown as WithCtxRef;

			expect(outerConsumer.ctxRef.current).toBe(outerProvider.ctxValue);
			expect(innerConsumer.ctxRef.current).toBe(innerProvider.ctxValue);
			expect(outerConsumer.ctxRef.current).not.toBe(innerConsumer.ctxRef.current);
		});
	});
});
