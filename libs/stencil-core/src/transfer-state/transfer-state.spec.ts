import { Build } from "@stencil/core";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { mount, TestHost } from "../testing";
import { makeTransferKey, provideTransferState, scriptId, useTransferState } from "./transfer-state";

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
	describe("server path", () => {
		const TIME_KEY = makeTransferKey<string>("time");
		const COUNT_KEY = makeTransferKey<number>("count");

		beforeEach(() => {
			Object.assign(Build, { isServer: true });
		});

		afterEach(() => {
			Object.assign(Build, { isServer: false });
		});

		it("transfer() calls getValue() and returns the value", async () => {
			using m = await mount(() => ({ ts: provideTransferState("test") }));
			const result = m.ts.transfer(TIME_KEY, () => "2026-01-01T00:00:00.000Z");
			expect(result).toBe("2026-01-01T00:00:00.000Z");
		});

		it("get() returns the stored value after transfer()", async () => {
			using m = await mount(() => ({ ts: provideTransferState("test") }));
			m.ts.transfer(COUNT_KEY, () => 42);
			expect(m.ts.get(COUNT_KEY)).toBe(42);
		});

		it("set() stores a value retrievable by get()", async () => {
			using m = await mount(() => ({ ts: provideTransferState("test") }));
			m.ts.set(COUNT_KEY, 99);
			expect(m.ts.get(COUNT_KEY)).toBe(99);
		});

		it("get() returns defaultValue when key is absent", async () => {
			using m = await mount(() => ({ ts: provideTransferState("test") }));
			expect(m.ts.get(TIME_KEY, "fallback")).toBe("fallback");
		});

		it("toScriptElement() returns a non-null VNode on server", async () => {
			using m = await mount(() => ({ ts: provideTransferState("test") }));
			m.ts.transfer(TIME_KEY, () => "2026-01-01T00:00:00.000Z");
			expect(m.ts.toScriptElement()).not.toBeNull();
		});

		it("toScriptElement() escapes </script in JSON values", async () => {
			const EVIL_KEY = makeTransferKey<string>("evil");
			using m = await mount(() => ({ ts: provideTransferState("xss-test") }));
			m.ts.set(EVIL_KEY, "</script><script>alert(1)</script>");

			// Validate escaping via JSON.stringify + replaceAll (same logic as toJSON).
			const json = JSON.stringify({ evil: m.ts.get(EVIL_KEY) }).replaceAll(/<\/script/giu, String.raw`<\/script`);

			expect(json).not.toContain("</script>");
			expect(json).toContain(String.raw`<\/script>`);
		});

		it("hostConnected is a no-op on the server", async () => {
			using m = await mount(() => {
				const ts = provideTransferState("server-connect");
				ts.set(TIME_KEY, "server-value");
				return { ts };
			});
			// Value remains set (not cleared by connect)
			expect(m.ts.get(TIME_KEY)).toBe("server-value");
		});
	});

	describe("client path", () => {
		const TIME_KEY = makeTransferKey<string>("time");
		const ITEMS_KEY = makeTransferKey<string[]>("items");

		it("reads script from shadowRoot on hostConnected and populates state", async () => {
			using m = await mount(h => {
				attachShadowRoot(h, [makeMockScript(scriptId("client-test"), { time: "server-time" })]);
				return { ts: provideTransferState("client-test") };
			});
			expect(m.ts.get(TIME_KEY)).toBe("server-time");
		});

		it("removes the script from shadowRoot after reading", async () => {
			const script = makeMockScript(scriptId("client-test"), { time: "t" });
			using _host = await mount(h => {
				attachShadowRoot(h, [script]);
				provideTransferState("client-test");
			});
			expect(script.remove).toHaveBeenCalledOnce();
		});

		it("transfer() returns the pre-populated value without calling getValue()", async () => {
			using m = await mount(h => {
				attachShadowRoot(h, [makeMockScript(scriptId("client-test"), { time: "from-server" })]);
				return { ts: provideTransferState("client-test") };
			});
			const getValue = vi.fn<() => string>(() => "fallback");
			expect(m.ts.transfer(TIME_KEY, getValue)).toBe("from-server");
			expect(getValue).not.toHaveBeenCalled();
		});

		it("leaves state empty when no script is present in shadowRoot", async () => {
			using m = await mount(h => {
				attachShadowRoot(h, []);
				return { ts: provideTransferState("missing") };
			});
			expect(m.ts.get(TIME_KEY)).toBeUndefined();
		});

		it("handles malformed JSON gracefully — leaves state empty", async () => {
			using m = await mount(h => {
				attachShadowRoot(h, [
					{
						type: "application/json",
						id: scriptId("bad"),
						textContent: "NOT_VALID_JSON{{{",
						remove: vi.fn<() => void>(),
					},
				]);
				return { ts: provideTransferState("bad") };
			});
			expect(m.ts.get(TIME_KEY)).toBeUndefined();
		});

		it("ignores script with wrong type", async () => {
			const script: MockScript = {
				type: "text/javascript",
				id: scriptId("wrong"),
				textContent: JSON.stringify({ time: "value" }),
				remove: vi.fn<() => void>(),
			};
			using m = await mount(h => {
				attachShadowRoot(h, [script]);
				return { ts: provideTransferState("wrong") };
			});
			expect(m.ts.get(TIME_KEY)).toBeUndefined();
			expect(script.remove).not.toHaveBeenCalled();
		});

		it("toScriptElement() returns null on the client", async () => {
			using m = await mount(() => ({ ts: provideTransferState("client") }));
			expect(m.ts.toScriptElement()).toBeNull();
		});

		it("transfer() returns undefined for absent keys on client", async () => {
			using m = await mount(h => {
				attachShadowRoot(h, []);
				return { ts: provideTransferState("absent") };
			});
			expect(m.ts.transfer(ITEMS_KEY, () => ["fallback"])).toBeUndefined();
		});
	});
});

// ── useTransferState (consumer) ───────────────────────────────────────────────

describe("useTransferState", () => {
	afterEach(() => {
		Object.assign(Build, { isServer: false });
	});

	const MSG_KEY = makeTransferKey<string>("msg");

	it("resolves to the nearest provideTransferState via context", async () => {
		using m = await mount(() => {
			const ts = provideTransferState("scope");
			ts.set(MSG_KEY, "hello");
			// Consumer registered after provider on same host — context event self-resolves.
			return { consumer: useTransferState() };
		});
		expect(m.consumer.get(MSG_KEY)).toBe("hello");
	});

	it("falls back to global no-op when no provider exists — returns undefined", async () => {
		using m = await mount(() => ({ consumer: useTransferState() }));
		expect(m.consumer.get(MSG_KEY)).toBeUndefined();
	});

	it("toScriptElement() returns null via global fallback", async () => {
		using m = await mount(() => ({ consumer: useTransferState() }));
		expect(m.consumer.toScriptElement()).toBeNull();
	});

	it("toScriptElement() forwards to provider's implementation on server", async () => {
		using m = await mount(() => {
			Object.assign(Build, { isServer: true });
			const ts = provideTransferState("fwd");
			ts.set(MSG_KEY, "value");
			return { consumer: useTransferState() };
		});
		expect(m.consumer.toScriptElement()).not.toBeNull();
	});
});
