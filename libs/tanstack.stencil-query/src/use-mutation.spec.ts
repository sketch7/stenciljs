import { TestHost } from "@ssv/stencil.core/testing";
import { QueryClient, noop } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMutation } from "./use-mutation";

describe("useMutation", () => {
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
		const mutation = useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc);
		expect(mutation().isIdle).toBeTruthy();
		expect(mutation().isPending).toBeFalsy();
		expect(mutation().data).toBeUndefined();
	});

	it("is idle after connect with no call", () => {
		const mutation = useMutation({ mutationFn: vi.fn<() => Promise<unknown>>() }, qc);
		host.connect();
		expect(mutation().isIdle).toBeTruthy();
		expect(mutation().status).toBe("idle");
	});

	it("transitions to success after mutateAsync resolves", async () => {
		const mutation = useMutation({ mutationFn: (v: number) => Promise.resolve(v * 2) }, qc);
		host.connect();
		await host.willLoad();

		const result = await mutation().mutateAsync(5);
		// notifyManager schedules notifications as microtasks — wait for them to flush
		await vi.waitFor(() => expect(mutation().isSuccess).toBeTruthy());

		expect(result).toBe(10);
		expect(mutation().data).toBe(10);
	});

	it("transitions to error when mutationFn rejects", async () => {
		const mutation = useMutation(
			{
				mutationFn: () => Promise.reject(new Error("fail")),
			},
			qc,
		);
		host.connect();
		await host.willLoad();

		await mutation().mutateAsync().catch(noop);
		await vi.waitFor(() => expect(mutation().isError).toBeTruthy());

		expect((mutation().error as Error).message).toBe("fail");
	});

	it("mutate() fire-and-forget — does not throw", () => {
		const mutationFn = vi.fn<() => Promise<string>>().mockResolvedValue("ok");
		const mutation = useMutation({ mutationFn }, qc);
		host.connect();

		expect(() => mutation().mutate()).not.toThrow();
	});

	it("exposes variables during and after mutation", async () => {
		const mutation = useMutation({ mutationFn: (v: string) => Promise.resolve(v.toUpperCase()) }, qc);
		host.connect();
		await host.willLoad();

		await mutation().mutateAsync("hello");
		await vi.waitFor(() => expect(mutation().variables).toBe("hello"));
		expect(mutation().variables).toBe("hello");
	});

	it("reset() returns to idle state", async () => {
		const mutation = useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();

		await mutation().mutateAsync(1);
		await vi.waitFor(() => expect(mutation().isSuccess).toBeTruthy());

		mutation().reset();
		await vi.waitFor(() => expect(mutation().isIdle).toBeTruthy());

		expect(mutation().data).toBeUndefined();
	});

	it("triggers requestUpdate when mutation state changes", async () => {
		const mutation = useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();

		await mutation().mutateAsync(42);
		await vi.waitFor(() => expect(host.renderCount).toBeGreaterThan(0));
		expect(host.renderCount).toBeGreaterThan(0);
	});

	it("does not trigger requestUpdate after disconnect", async () => {
		const mutation = useMutation({ mutationFn: (v: number) => Promise.resolve(v) }, qc);
		host.connect();
		await host.willLoad();
		host.disconnect();

		const countBefore = host.renderCount;
		// observer is undefined after disconnect — mutate() should be a no-op
		mutation().mutate(42 as never);

		expect(host.renderCount).toBe(countBefore);
	});

	it("onSuccess callback fires with result data", async () => {
		const onSuccess = vi.fn<(data: number, variables: number, context: undefined, mutation: unknown) => void>();
		const mutation = useMutation({ mutationFn: (v: number) => Promise.resolve(v + 1), onSuccess }, qc);
		host.connect();
		await host.willLoad();

		await mutation().mutateAsync(9);
		// TanStack Query v5 passes (data, variables, context, mutation) to onSuccess
		await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything()));
		expect(onSuccess).toHaveBeenCalledWith(10, 9, undefined, expect.anything());
	});

	it("component subclass pattern", async () => {
		class ComponentLike extends TestHost {
			readonly mutation = useMutation({ mutationFn: (v: string) => Promise.resolve(v) }, qc);
		}
		const comp = new ComponentLike();
		comp.connect();
		await comp.willLoad();

		await comp.mutation().mutateAsync("test");
		await vi.waitFor(() => expect(comp.mutation().data).toBe("test"));

		comp.disconnect();
		comp.dispose();
		expect(comp.mutation().isIdle).toBeTruthy();
	});
});
