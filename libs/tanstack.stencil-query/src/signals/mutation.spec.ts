// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost, mount } from "@ssv/stencil-core/testing";
import { QueryClient, noop } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useMutation } from "./mutation";

describe("$useMutation", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient();
	});

	afterEach(() => {
		qc.clear();
	});

	it("starts in idle state — no mutation called", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc),
		}));
		expect(m.mutation.isIdle()).toBeTruthy();
		expect(m.mutation.isPending()).toBeFalsy();
		expect(m.mutation.data()).toBeUndefined();
	});

	it("is idle after connect with no call", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc),
		}));
		expect(m.mutation.isIdle()).toBeTruthy();
		expect(m.mutation.status()).toBe("idle");
	});

	it("transitions to success after mutateAsync resolves", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: number) => Promise.resolve(v * 2) }, qc),
		}));

		const result = await m.mutation.mutateAsync(5);
		await vi.waitFor(() => expect(m.mutation.isSuccess()).toBeTruthy());

		expect(result).toBe(10);
		expect(m.mutation.data()).toBe(10);
	});

	it("transitions to error when mutationFn rejects", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: () => Promise.reject(new Error("fail")) }, qc),
		}));

		await m.mutation.mutateAsync().catch(noop);
		await vi.waitFor(() => expect(m.mutation.isError()).toBeTruthy());

		expect((m.mutation.error() as Error).message).toBe("fail");
	});

	it("mutate() fire-and-forget — does not throw", async () => {
		const mutationFn = vi.fn<() => Promise<string>>().mockResolvedValue("ok");
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn }, qc),
		}));

		expect(() => m.mutation.mutate()).not.toThrow();
	});

	it("exposes variables during and after mutation", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: string) => Promise.resolve(v.toUpperCase()) }, qc),
		}));

		await m.mutation.mutateAsync("hello");
		await vi.waitFor(() => expect(m.mutation.variables()).toBe("hello"));
		expect(m.mutation.variables()).toBe("hello");
	});

	it("reset() returns to idle state", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc),
		}));

		await m.mutation.mutateAsync(1);
		await vi.waitFor(() => expect(m.mutation.isSuccess()).toBeTruthy());

		m.mutation.reset();
		await vi.waitFor(() => expect(m.mutation.isIdle()).toBeTruthy());

		expect(m.mutation.data()).toBeUndefined();
	});

	it("updates field signals when mutation state changes", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc),
		}));

		await m.mutation.mutateAsync(42);
		await vi.waitFor(() => expect(m.mutation.data()).toBe(42));
		expect(m.mutation.isSuccess()).toBeTruthy();
	});

	it("exposes stable per-field signal identity (memoized computeds)", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc),
		}));
		// The proxy memoizes the computed per field, so repeated access returns the same signal.
		expect(m.mutation.data).toBe(m.mutation.data);
		expect(m.mutation.isPending).toBe(m.mutation.isPending);
	});

	it("resets to idle after disconnect", async () => {
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc),
		}));

		await m.mutation.mutateAsync(7);
		await vi.waitFor(() => expect(m.mutation.isSuccess()).toBeTruthy());

		m.disconnect();
		expect(m.mutation.isIdle()).toBeTruthy();
		expect(m.mutation.data()).toBeUndefined();
	});

	it("onSuccess callback fires with result data", async () => {
		const onSuccess = vi.fn<(data: number, variables: number, context: undefined, mutation: unknown) => void>();
		using m = await mount(() => ({
			mutation: $useMutation({ mutationFn: (v: number) => Promise.resolve(v + 1), onSuccess }, qc),
		}));

		await m.mutation.mutateAsync(9);
		// TanStack Query v5 passes (data, variables, context, mutation) to onSuccess
		await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything()));
		expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything());
	});

	it("component subclass pattern", async () => {
		class ComponentLike extends TestHost {
			readonly mutation = $useMutation({ mutationFn: (v: string) => Promise.resolve(v) }, qc);
		}
		using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });

		await comp.mutation.mutateAsync("test");
		await vi.waitFor(() => expect(comp.mutation.data()).toBe("test"));

		comp.disconnect();
		expect(comp.mutation.isIdle()).toBeTruthy();
	});
});
