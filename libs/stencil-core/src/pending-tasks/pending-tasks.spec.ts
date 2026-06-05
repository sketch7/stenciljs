import { Build } from "@stencil/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount, TestHost } from "../testing";
import { usePendingTasks } from "./pending-tasks";

// ── usePendingTasks — server path ─────────────────────────────────────────────

describe("usePendingTasks", () => {
	describe("server", () => {
		beforeEach(() => {
			Object.assign(Build, { isServer: true });
			vi.clearAllMocks();
		});

		afterEach(() => {
			Object.assign(Build, { isServer: false });
		});

		it("runs the factory in hostWillLoad", async () => {
			const factory = vi.fn<() => Promise<void>>(async () => {});

			using _m = await mount(() => {
				const tasks = usePendingTasks();
				tasks.add(factory);
			});

			expect(factory).toHaveBeenCalledOnce();
		});

		it("runs all registered factories", async () => {
			const order: number[] = [];

			using _m = await mount(() => {
				const tasks = usePendingTasks();
				tasks.add(async () => {
					order.push(1);
				});
				tasks.add(async () => {
					order.push(2);
				});
			});

			expect(order).toContain(1);
			expect(order).toContain(2);
		});

		it("handles a void-returning factory without throwing", async () => {
			let mounted = false;
			using _m = await mount(() => {
				const tasks = usePendingTasks();
				tasks.add(() => undefined);
				mounted = true;
			});
			expect(mounted).toBeTruthy();
		});

		it("does not run the factory before hostWillLoad", () => {
			const factory = vi.fn<() => void>();

			using host = new TestHost();
			const tasks = usePendingTasks();
			tasks.add(factory);

			expect(factory).not.toHaveBeenCalled();
			host.connect();
			expect(factory).not.toHaveBeenCalled();
		});
	});

	// ── client path ───────────────────────────────────────────────────────────

	describe("client", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("does not run the factory on the client", async () => {
			const factory = vi.fn<() => void>();

			using _m = await mount(() => {
				const tasks = usePendingTasks();
				tasks.add(factory);
			});

			expect(factory).not.toHaveBeenCalled();
		});
	});
});
