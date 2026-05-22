// oxlint-disable-next-line import/no-unassigned-import -- registers the TC39 signal adapter
import "@ssv/stencil-signals/tc39";
import { TestHost } from "@ssv/stencil.core/testing";
import { QueryClient, noop } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $useMutation } from "./mutation";

describe("$useMutation", () => {
	let host: TestHost;
	let qc: QueryClient;

	beforeEach(() => {
		host = new TestHost();
		qc = new QueryClient();
	});

	afterEach(() => {
		host.dispose();
		qc.clear();
	});

	it("starts in idle state before connect", () => {
		const m = $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc);
		expect(m.isIdle()).toBeTruthy();
		expect(m.isPending()).toBeFalsy();
		expect(m.data()).toBeUndefined();
	});

	it("is idle after connect with no call", () => {
		const m = $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc);
		host.connect();
		expect(m.isIdle()).toBeTruthy();
		expect(m.status()).toBe("idle");
	});

	it("transitions to success after mutateAsync resolves", async () => {
		const m = $useMutation({ mutationFn: (v: number) => Promise.resolve(v * 2) }, qc);
		host.connect();
		await host.willLoad();

		const result = await m.mutateAsync(5);
		await vi.waitFor(() => expect(m.isSuccess()).toBeTruthy());

		expect(result).toBe(10);
		expect(m.data()).toBe(10);
	});

	it("transitions to error when mutationFn rejects", async () => {
		const m = $useMutation({ mutationFn: () => Promise.reject(new Error("fail")) }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync().catch(noop);
		await vi.waitFor(() => expect(m.isError()).toBeTruthy());

		expect((m.error() as Error).message).toBe("fail");
	});

	it("mutate() fire-and-forget — does not throw", () => {
		const mutationFn = vi.fn<() => Promise<string>>().mockResolvedValue("ok");
		const m = $useMutation({ mutationFn }, qc);
		host.connect();

		expect(() => m.mutate()).not.toThrow();
	});

	it("exposes variables during and after mutation", async () => {
		const m = $useMutation({ mutationFn: (v: string) => Promise.resolve(v.toUpperCase()) }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync("hello");
		await vi.waitFor(() => expect(m.variables()).toBe("hello"));
		expect(m.variables()).toBe("hello");
	});

	it("reset() returns to idle state", async () => {
		const m = $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync(1);
		await vi.waitFor(() => expect(m.isSuccess()).toBeTruthy());

		m.reset();
		await vi.waitFor(() => expect(m.isIdle()).toBeTruthy());

		expect(m.data()).toBeUndefined();
	});

	it("updates field signals when mutation state changes", async () => {
		const m = $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync(42);
		await vi.waitFor(() => expect(m.data()).toBe(42));
		expect(m.isSuccess()).toBeTruthy();
	});

	it("exposes stable per-field signal identity (memoized computeds)", () => {
		const m = $useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc);
		// The proxy memoizes the computed per field, so repeated access returns the same signal.
		expect(m.data).toBe(m.data);
		expect(m.isPending).toBe(m.isPending);
	});

	it("resets to idle after disconnect", async () => {
		const m = $useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync(7);
		await vi.waitFor(() => expect(m.isSuccess()).toBeTruthy());

		host.disconnect();
		expect(m.isIdle()).toBeTruthy();
		expect(m.data()).toBeUndefined();
	});

	it("onSuccess callback fires with result data", async () => {
		const onSuccess = vi.fn<(data: number, variables: number, context: undefined, mutation: unknown) => void>();
		const m = $useMutation({ mutationFn: (v: number) => Promise.resolve(v + 1), onSuccess }, qc);
		host.connect();
		await host.willLoad();

		await m.mutateAsync(9);
		// TanStack Query v5 passes (data, variables, context, mutation) to onSuccess
		await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything()));
		expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything());
	});

	it("component subclass pattern", async () => {
		class ComponentLike extends TestHost {
			readonly mutation = $useMutation({ mutationFn: (v: string) => Promise.resolve(v) }, qc);
		}
		const comp = new ComponentLike();
		comp.connect();
		await comp.willLoad();

		await comp.mutation.mutateAsync("test");
		await vi.waitFor(() => expect(comp.mutation.data()).toBe("test"));

		comp.disconnect();
		comp.dispose();
		expect(comp.mutation.isIdle()).toBeTruthy();
	});
});
