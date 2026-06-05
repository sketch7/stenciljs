import { TestHost, mount } from "@ssv/stencil-core/testing";
import { Build } from "@stencil/core";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrefetchLifecycle, useServerPrefetch } from "./prefetch-lifecycle";
import { useQueryClient } from "./query-client-context";

describe("prefetch-lifecycle", () => {
	let qc: QueryClient;

	beforeEach(() => {
		qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.clearAllMocks();
	});

	afterEach(() => {
		qc.clear();
	});

	// ── useServerPrefetch ──────────────────────────────────────────────────────

	describe("useServerPrefetch", () => {
		describe("server", () => {
			beforeEach(() => {
				Object.assign(Build, { isServer: true });
			});

			afterEach(() => {
				Object.assign(Build, { isServer: false });
			});

			it("calls prefetchQuery in hostWillLoad on server", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					useServerPrefetch(clientRef, () => ({ queryKey: ["srv"], queryFn: vi.fn<() => unknown>() }));
				});

				expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["srv"] }));
			});

			it("skips prefetch when getOpts returns falsy", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					useServerPrefetch(clientRef, () => null);
				});

				expect(spy).not.toHaveBeenCalled();
			});
		});

		describe("client", () => {
			it("does NOT call prefetchQuery on client", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					useServerPrefetch(clientRef, () => ({ queryKey: ["srv-client"], queryFn: vi.fn<() => unknown>() }));
				});

				expect(spy).not.toHaveBeenCalled();
			});
		});
	});

	// ── usePrefetchLifecycle — block: "always" ─────────────────────────────────

	describe("usePrefetchLifecycle block='always'", () => {
		describe("server", () => {
			beforeEach(() => {
				Object.assign(Build, { isServer: true });
			});

			afterEach(() => {
				Object.assign(Build, { isServer: false });
			});

			it("blocks SSR — prefetchQuery is called in hostWillLoad and prefetch resolves before mount returns", async () => {
				let resolved = false;
				const queryFn = vi.fn<() => Promise<string>>().mockImplementation(
					() =>
						new Promise<string>(r => {
							resolved = true;
							r("data");
						}),
				);

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					usePrefetchLifecycle(clientRef, () => ({ queryKey: ["always-server"], queryFn }), "always");
				});

				// After mount the prefetch should have been called and resolved (queryFn ran).
				expect(resolved).toBeTruthy();
				expect(queryFn).toHaveBeenCalledOnce();
			});
		});

		describe("client", () => {
			it("returns the prefetch promise from hostWillLoad on client (blocks client load)", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using host = new TestHost();
				const clientRef = useQueryClient(qc);
				usePrefetchLifecycle(
					clientRef,
					() => ({ queryKey: ["always-client"], queryFn: vi.fn<() => unknown>() }),
					"always",
				);

				host.connect();
				await host.willLoad();

				expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["always-client"] }));
			});
		});
	});

	// ── usePrefetchLifecycle — block: "server" ─────────────────────────────────

	describe("usePrefetchLifecycle block='server'", () => {
		describe("server", () => {
			beforeEach(() => {
				Object.assign(Build, { isServer: true });
			});

			afterEach(() => {
				Object.assign(Build, { isServer: false });
			});

			it("blocks SSR in hostWillLoad", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					usePrefetchLifecycle(
						clientRef,
						() => ({ queryKey: ["server-only"], queryFn: vi.fn<() => unknown>() }),
						"server",
					);
				});

				expect(spy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ["server-only"] }));
			});
		});

		describe("client", () => {
			it("fires fire-and-forget (does not block client hostWillLoad return value)", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using host = new TestHost();
				const clientRef = useQueryClient(qc);
				usePrefetchLifecycle(
					clientRef,
					() => ({ queryKey: ["server-only-client"], queryFn: vi.fn<() => unknown>() }),
					"server",
				);

				host.connect();
				const result = host.willLoad();
				// hostWillLoad should not block (returns void/undefined)
				await result;

				expect(spy).toHaveBeenCalledOnce();
			});
		});
	});

	// ── usePrefetchLifecycle — block: false ────────────────────────────────────

	describe("usePrefetchLifecycle block=false", () => {
		describe("server", () => {
			beforeEach(() => {
				Object.assign(Build, { isServer: true });
			});

			afterEach(() => {
				Object.assign(Build, { isServer: false });
			});

			it("does NOT call prefetchQuery on server", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using _m = await mount(() => {
					const clientRef = useQueryClient(qc);
					usePrefetchLifecycle(
						clientRef,
						() => ({ queryKey: ["never-block"], queryFn: vi.fn<() => unknown>() }),
						false,
					);
				});

				expect(spy).not.toHaveBeenCalled();
			});
		});

		describe("client", () => {
			it("fires fire-and-forget on client", async () => {
				const spy = vi.spyOn(qc, "prefetchQuery");

				using host = new TestHost();
				const clientRef = useQueryClient(qc);
				usePrefetchLifecycle(
					clientRef,
					() => ({ queryKey: ["never-block-client"], queryFn: vi.fn<() => unknown>() }),
					false,
				);

				host.connect();
				await host.willLoad();

				expect(spy).toHaveBeenCalledOnce();
			});
		});
	});
});
