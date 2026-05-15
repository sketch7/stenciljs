import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestHost } from "../testing/test-host";
import { useTransferState } from "./transfer-state";

// ── Mock document helpers ──────────────────────────────────────────────────────
type MockScript = { type: string; id: string; textContent: string; remove: ReturnType<typeof vi.fn> };

function createMockDocument() {
	const scripts = new Map<string, MockScript>();

	const createElement = vi.fn<(tag: string) => MockScript>(_tag => ({
		type: "",
		id: "",
		textContent: "",
		remove: vi.fn<() => void>(),
	}));

	const head = {
		append: vi.fn<(script: MockScript) => void>(script => scripts.set(script.id, script)),
	};

	const querySelector = vi.fn<(selector: string) => MockScript | null>(selector => {
		// selector is `#ssv-ts-{key}` — strip the leading `#`
		const id = selector.startsWith("#") ? selector.slice(1) : selector;
		return scripts.get(id) ?? null;
	});

	return { head, createElement, querySelector, scripts };
}

describe("useTransferState", () => {
	let host: TestHost;
	let mockDoc: ReturnType<typeof createMockDocument>;

	beforeEach(() => {
		host = new TestHost();
		mockDoc = createMockDocument();
		(globalThis as Record<string, unknown>)["document"] = mockDoc;
	});

	afterEach(() => {
		host.dispose();
		vi.unstubAllGlobals();
		delete (globalThis as Record<string, unknown>)["document"];
	});

	describe("server path (detectServer = true)", () => {
		beforeEach(() => {
			vi.stubGlobal("requestAnimationFrame", undefined);
		});

		it("injects script tag into document.head on hostWillRender", () => {
			const data = [{ id: 1, title: "Post" }];
			useTransferState("test-key", () => data);

			host.render();

			expect(mockDoc.head.append).toHaveBeenCalledTimes(1);
			const injected = [...mockDoc.scripts.values()][0];
			expect(injected.id).toBe("ssv-ts-test-key");
			expect(injected.type).toBe("application/json");
			expect(JSON.parse(injected.textContent)).toStrictEqual(data);
		});

		it("does not inject more than once on subsequent renders", () => {
			useTransferState("idempotent-key", () => ({ value: 42 }));

			host.render();
			host.render();

			expect(mockDoc.head.append).toHaveBeenCalledTimes(1);
		});

		it("escapes </script to prevent XSS in injected JSON", () => {
			useTransferState("xss-key", () => ({ evil: "</script><script>alert(1)</script>" }));
			host.render();

			const injected = [...mockDoc.scripts.values()][0];
			expect(injected.textContent).not.toContain("</script>");
			expect(injected.textContent).toContain(String.raw`<\/script>`);
		});

		it("does not read document on the server (hostConnected is no-op)", () => {
			useTransferState("server-connect-noop", () => "value");
			host.connect();

			expect(mockDoc.querySelector).not.toHaveBeenCalled();
		});
	});

	describe("client path (detectServer = false)", () => {
		beforeEach(() => {
			vi.stubGlobal("requestAnimationFrame", vi.fn<() => number>());
		});

		it("reads and removes existing script tag on hostConnected", () => {
			const data = { posts: [{ id: 1 }] };
			const scriptEl: MockScript = {
				type: "application/json",
				id: "ssv-ts-client-key",
				textContent: JSON.stringify(data),
				remove: vi.fn<() => void>(),
			};
			mockDoc.scripts.set("ssv-ts-client-key", scriptEl);

			const ref = useTransferState<typeof data>("client-key", () => data);
			host.connect();

			expect(ref.value).toStrictEqual(data);
			expect(scriptEl.remove).toHaveBeenCalledTimes(1);
		});

		it("leaves value undefined when script tag is absent", () => {
			const ref = useTransferState<string[]>("missing-key", () => []);
			host.connect();

			expect(ref.value).toBeUndefined();
		});

		it("leaves value undefined when script has wrong type", () => {
			const scriptEl: MockScript = {
				type: "text/javascript",
				id: "ssv-ts-wrong-type",
				textContent: '["data"]',
				remove: vi.fn<() => void>(),
			};
			mockDoc.scripts.set("ssv-ts-wrong-type", scriptEl);

			const ref = useTransferState<string[]>("wrong-type", () => []);
			host.connect();

			expect(ref.value).toBeUndefined();
			expect(scriptEl.remove).not.toHaveBeenCalled();
		});

		it("leaves value undefined when JSON is malformed", () => {
			const scriptEl: MockScript = {
				type: "application/json",
				id: "ssv-ts-bad-json",
				textContent: "NOT VALID JSON {{{",
				remove: vi.fn<() => void>(),
			};
			mockDoc.scripts.set("ssv-ts-bad-json", scriptEl);

			const ref = useTransferState<unknown>("bad-json", () => null);
			host.connect();

			expect(ref.value).toBeUndefined();
		});

		it("does not inject script tags on the client", () => {
			useTransferState("no-inject-client", () => "server-only");
			host.render();

			expect(mockDoc.head.append).not.toHaveBeenCalled();
		});
	});
});
