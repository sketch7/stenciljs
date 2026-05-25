import { TestHost } from "@ssv/stencil-core/testing";
import { Build } from "@stencil/core";
import { describe, it, expect, afterEach } from "vitest";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";

import { useSignalWatcher } from "../src/controllers/signal-watcher-controller";
import { derivedAsync } from "../src/extensions/derived-async";

describe("derivedAsync SSR", () => {
	let previousIsServer: boolean;

	afterEach(() => {
		(Build as { isServer: boolean }).isServer = previousIsServer;
	});

	it("hostWillLoad awaits first settlement before render", async () => {
		previousIsServer = Build.isServer;
		(Build as { isServer: boolean }).isServer = true;

		const host = new TestHost();
		useSignalWatcher();
		let resolvePending!: (value: number) => void;
		const pending = new Promise<number>(resolve => {
			resolvePending = resolve;
		});

		const result = derivedAsync(async () => pending);

		host.connect();
		expect(result()).toBeUndefined();

		resolvePending(42);
		await host.willLoad();
		expect(result()).toBe(42);
		host.dispose();
	});

	it("hostWillLoad awaits rejection settlement", async () => {
		previousIsServer = Build.isServer;
		(Build as { isServer: boolean }).isServer = true;

		const host = new TestHost();
		useSignalWatcher();
		let rejectPending!: (error: Error) => void;
		const pending = new Promise<number>((_, reject) => {
			rejectPending = reject;
		});

		const result = derivedAsync(async () => pending);

		host.connect();
		rejectPending(new Error("ssr-fail"));
		await host.willLoad();
		expect(() => result()).toThrow("ssr-fail");
		host.dispose();
	});
});
