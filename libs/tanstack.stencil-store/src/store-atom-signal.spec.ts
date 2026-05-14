// oxlint-disable-next-line import/no-unassigned-import -- registers TC39 adapter before `@ssv/stencil-signals` primitives
import "@ssv/stencil-signals/tc39";
import { TestHost } from "@ssv/stencil.core/testing";
import { createAtom } from "@tanstack/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAtomSignal } from "./store-atom-signal";

describe("useAtomSignal", () => {
	let host: TestHost;

	beforeEach(() => {
		host = new TestHost();
	});

	afterEach(() => {
		host.dispose();
	});

	it("propagates atom updates into the writable signal", () => {
		const atom = createAtom(0);
		const sig = useAtomSignal(() => atom);
		host.render();

		expect(sig()).toBe(0);
		atom.set(7);
		expect(sig()).toBe(7);
	});

	it("set and update forward to the TanStack atom", () => {
		const atom = createAtom(10);
		const sig = useAtomSignal(() => atom);
		host.render();

		sig.set(20);
		expect(atom.get()).toBe(20);
		expect(sig()).toBe(20);

		sig.update(() => 22);
		expect(atom.get()).toBe(22);
		expect(sig()).toBe(22);
	});

	it("disconnect unsubscribes — atom changes no longer sync", () => {
		const atom = createAtom(0);
		const sig = useAtomSignal(() => atom);
		host.render();

		host.disconnect();

		expect(sig()).toBeUndefined();
		atom.set(50);
		expect(sig()).toBeUndefined();
	});

	it("rebinds when getAtom resolves to a different atom", () => {
		const atomA = createAtom("a");
		const atomB = createAtom("b");
		let active = atomA;
		const sig = useAtomSignal(() => active);

		host.render();
		expect(sig()).toBe("a");

		active = atomB;
		host.render();
		expect(sig()).toBe("b");

		atomA.set("aa");
		expect(sig()).toBe("b");

		atomB.set("bb");
		expect(sig()).toBe("bb");
	});

	it("compare suppresses redundant mirrored updates", () => {
		const atom = createAtom(1);
		const sig = useAtomSignal(() => atom, {
			compare: (a, b) => Math.abs((a as number) - (b as number)) < 5,
		});
		host.render();

		expect(sig()).toBe(1);
		atom.set(3);
		expect(sig()).toBe(1);

		atom.set(10);
		expect(sig()).toBe(10);
	});
});
