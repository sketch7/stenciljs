import { render, h } from "@stencil/vitest";
import { describe, it, expect } from "vitest";

import type { ReactiveController } from "#lib";

// Test components are defined in co-located files (one @Component per module,
// per Stencil's module bundling rules) and registered via vitest-setup.ts.
// No import needed here — JSX tags reference the registered custom elements.
type WithControllers = HTMLElement & { controllers: Set<ReactiveController> };

describe("hooks", () => {
	describe("host context isolation", () => {
		it("registers all controllers onto the component's own host", async () => {
			const { root } = await render(<test-counter />);

			const el = root as unknown as WithControllers;
			expect(el.controllers.size).toBe(2);
		});

		it("isolates controllers between sibling instances", async () => {
			const { root: rootA } = await render(<test-counter />);
			const { root: rootB } = await render(<test-counter />);

			const a = rootA as unknown as WithControllers;
			const b = rootB as unknown as WithControllers;

			// No controller instance is shared between the two hosts
			for (const ctrl of a.controllers) {
				expect(b.controllers.has(ctrl)).toBeFalsy();
			}
			expect(a.controllers.size).toBe(2);
			expect(b.controllers.size).toBe(2);
		});

		it("isolates controllers between nested parent and child", async () => {
			const { root, waitForChanges } = await render(<test-parent />);
			await waitForChanges();

			const parent = root as unknown as WithControllers;
			expect(parent.controllers.size).toBe(1);

			const childEl = root.shadowRoot!.querySelector("test-child") as unknown as WithControllers;
			expect(childEl).not.toBeNull();
			expect(childEl.controllers.size).toBe(1);

			// The controller instances must be distinct objects
			const [parentCtrl] = parent.controllers;
			const [childCtrl] = childEl.controllers;
			expect(parentCtrl).not.toBe(childCtrl);
		});
	});
});
