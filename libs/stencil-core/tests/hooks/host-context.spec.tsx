import { render, h } from "@stencil/vitest";
import { describe, it, expect } from "vitest";

import type { ReactiveControllerRef } from "#lib";

// Test components are defined in co-located files (one @Component per module,
// per Stencil's module bundling rules) and registered via vitest-setup.ts.
// No import needed here — JSX tags reference the registered custom elements.
type WithReactiveRef = HTMLElement & { __reactiveRef: ReactiveControllerRef };

describe("hooks", () => {
	describe("host context isolation", () => {
		it("registers all controllers onto the component's own host", async () => {
			const { root } = await render(<test-counter />);

			const el = root as unknown as WithReactiveRef;
			expect(el.__reactiveRef.controllers.size).toBe(2);
		});

		it("isolates controllers between sibling instances", async () => {
			const { root: rootA } = await render(<test-counter />);
			const { root: rootB } = await render(<test-counter />);

			const a = rootA as unknown as WithReactiveRef;
			const b = rootB as unknown as WithReactiveRef;

			// No controller instance is shared between the two hosts
			for (const ctrl of a.__reactiveRef.controllers) {
				expect(b.__reactiveRef.controllers.has(ctrl)).toBeFalsy();
			}
			expect(a.__reactiveRef.controllers.size).toBe(2);
			expect(b.__reactiveRef.controllers.size).toBe(2);
		});

		it("isolates controllers between nested parent and child", async () => {
			const { root, waitForChanges } = await render(<test-parent />);
			await waitForChanges();

			const parent = root as unknown as WithReactiveRef;
			expect(parent.__reactiveRef.controllers.size).toBe(1);

			const childEl = root.shadowRoot!.querySelector("test-child") as unknown as WithReactiveRef;
			expect(childEl).not.toBeNull();
			expect(childEl.__reactiveRef.controllers.size).toBe(1);

			// The controller instances must be distinct objects
			const [parentCtrl] = parent.__reactiveRef.controllers;
			const [childCtrl] = childEl.__reactiveRef.controllers;
			expect(parentCtrl).not.toBe(childCtrl);
		});
	});
});
