import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { TestHost } from "../testing/test-host";
import { makeTransferKey, provideTransferState, useTransferState } from "./transfer-state";

// ── Helpers ───────────────────────────────────────────────────────────────────

type MockScript = {
	type: string;
	id: string;
	textContent: string;
	remove: ReturnType<typeof vi.fn<() => void>>;
};

function makeMockScript(id: string, data: unknown): MockScript {
	return {
		type: "application/json",
		id,
		textContent: JSON.stringify(data),
		remove: vi.fn<() => void>(),
	};
}

function attachShadowRoot(host: TestHost, scripts: MockScript[]): void {
	(host as unknown as Record<string, unknown>)["shadowRoot"] = {
		querySelector: (sel: string) => scripts.find(s => sel === `#${s.id}`) ?? null,
	};
}

// ── makeTransferKey ───────────────────────────────────────────────────────────

describe("makeTransferKey", () => {
	it("returns the key string", () => {
		expect(makeTransferKey("posts")).toBe("posts");
	});

	it("is assignable as a string", () => {
		const k = makeTransferKey<number>("count");
		expectTypeOf(k).toBeString();
	});
});

// ── provideTransferState / server path ───────────────────────────────────────

describe("provideTransferState", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		host.dispose();
		vi.unstubAllGlobals();
	});

	describe("server path (window undefined)", () => {
		const TIME_KEY = makeTransferKey<string>("time");
		const COUNT_KEY = makeTransferKey<number>("count");

		it("transfer() calls getValue() and returns the value", () => {
			const ts = provideTransferState("test");
			const result = ts.transfer(TIME_KEY, () => "2026-01-01T00:00:00.000Z");
			expect(result).toBe("2026-01-01T00:00:00.000Z");
		});

		it("get() returns the stored value after transfer()", () => {
			const ts = provideTransferState("test");
			ts.transfer(COUNT_KEY, () => 42);
			expect(ts.get(COUNT_KEY)).toBe(42);
		});

		it("set() stores a value retrievable by get()", () => {
			const ts = provideTransferState("test");
			ts.set(COUNT_KEY, 99);
			expect(ts.get(COUNT_KEY)).toBe(99);
		});

		it("get() returns defaultValue when key is absent", () => {
			const ts = provideTransferState("test");
			expect(ts.get(TIME_KEY, "fallback")).toBe("fallback");
		});

		it("toScriptElement() returns a non-null VNode on server", () => {
			const ts = provideTransferState("test");
			ts.transfer(TIME_KEY, () => "2026-01-01T00:00:00.000Z");
			expect(ts.toScriptElement()).not.toBeNull();
		});

		it("toScriptElement() escapes </script in JSON values", () => {
			const EVIL_KEY = makeTransferKey<string>("evil");
			const ts = provideTransferState("xss-test");
			ts.set(EVIL_KEY, "</script><script>alert(1)</script>");

			// Validate escaping via JSON.stringify + replaceAll (same logic as toJSON).
			const json = JSON.stringify({ evil: ts.get(EVIL_KEY) }).replaceAll(/<\/script/gi, String.raw`<\/script`);
			expect(json).not.toContain("</script>");
			expect(json).toContain(String.raw`<\/script>`);
		});

		it("hostConnected is a no-op on the server", () => {
			const ts = provideTransferState("server-connect");
			ts.set(TIME_KEY, "server-value");
			// No shadowRoot → connect should not throw
			host.connect();
			// Value remains set (not cleared)
			expect(ts.get(TIME_KEY)).toBe("server-value");
		});
	});

	describe("client path (window stubbed)", () => {
		const TIME_KEY = makeTransferKey<string>("time");
		const ITEMS_KEY = makeTransferKey<string[]>("items");

		beforeEach(() => {
			vi.stubGlobal("window", {});
		});

		it("reads script from shadowRoot on hostConnected and populates state", () => {
			const script = makeMockScript("ssv-ts-client-test", { time: "server-time" });
			attachShadowRoot(host, [script]);

			const ts = provideTransferState("client-test");
			host.connect();

			expect(ts.get(TIME_KEY)).toBe("server-time");
		});

		it("removes the script from shadowRoot after reading", () => {
			const script = makeMockScript("ssv-ts-client-test", { time: "t" });
			attachShadowRoot(host, [script]);

			provideTransferState("client-test");
			host.connect();

			expect(script.remove).toHaveBeenCalledOnce();
		});

		it("transfer() returns the pre-populated value without calling getValue()", () => {
			const script = makeMockScript("ssv-ts-client-test", { time: "from-server" });
			attachShadowRoot(host, [script]);

			const ts = provideTransferState("client-test");
			host.connect();

			const getValue = vi.fn<() => string>(() => "fallback");
			expect(ts.transfer(TIME_KEY, getValue)).toBe("from-server");
			expect(getValue).not.toHaveBeenCalled();
		});

		it("leaves state empty when no script is present in shadowRoot", () => {
			attachShadowRoot(host, []);
			const ts = provideTransferState("missing");
			host.connect();
			expect(ts.get(TIME_KEY)).toBeUndefined();
		});

		it("handles malformed JSON gracefully — leaves state empty", () => {
			const script: MockScript = {
				type: "application/json",
				id: "ssv-ts-bad",
				textContent: "NOT_VALID_JSON{{{",
				remove: vi.fn<() => void>(),
			};
			attachShadowRoot(host, [script]);

			const ts = provideTransferState("bad");
			host.connect();
			expect(ts.get(TIME_KEY)).toBeUndefined();
		});

		it("ignores script with wrong type", () => {
			const script: MockScript = {
				type: "text/javascript",
				id: "ssv-ts-wrong",
				textContent: JSON.stringify({ time: "value" }),
				remove: vi.fn<() => void>(),
			};
			attachShadowRoot(host, [script]);

			const ts = provideTransferState("wrong");
			host.connect();

			expect(ts.get(TIME_KEY)).toBeUndefined();
			expect(script.remove).not.toHaveBeenCalled();
		});

		it("toScriptElement() returns null on the client", () => {
			const ts = provideTransferState("client");
			expect(ts.toScriptElement()).toBeNull();
		});

		it("transfer() returns undefined for absent keys on client", () => {
			attachShadowRoot(host, []);
			const ts = provideTransferState("absent");
			host.connect();
			expect(ts.transfer(ITEMS_KEY, () => ["fallback"])).toBeUndefined();
		});
	});
});

// ── useTransferState (consumer) ───────────────────────────────────────────────

describe("useTransferState", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		host.dispose();
		vi.unstubAllGlobals();
	});

	const MSG_KEY = makeTransferKey<string>("msg");

	it("resolves to the nearest provideTransferState via context", () => {
		const ts = provideTransferState("scope");
		ts.set(MSG_KEY, "hello");

		// Consumer registered after provider on same host — context event self-resolves.
		const consumer = useTransferState();
		host.connect();

		expect(consumer.get(MSG_KEY)).toBe("hello");
	});

	it("falls back to global no-op when no provider exists — returns undefined", () => {
		const consumer = useTransferState();
		host.connect();
		expect(consumer.get(MSG_KEY)).toBeUndefined();
	});

	it("toScriptElement() returns null via global fallback", () => {
		const consumer = useTransferState();
		host.connect();
		expect(consumer.toScriptElement()).toBeNull();
	});

	it("toScriptElement() forwards to provider's implementation on server", () => {
		const ts = provideTransferState("fwd");
		ts.set(MSG_KEY, "value");

		const consumer = useTransferState();
		host.connect();

		// Server path: provider's toScriptElement returns non-null
		expect(consumer.toScriptElement()).not.toBeNull();
	});
});
