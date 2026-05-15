import { TestHost } from "@ssv/stencil.core/testing";
// oxlint-disable-next-line import/no-unassigned-import
import "../src/tc39";
import * as stencilCore from "@stencil/core";
import { describe, it, expect, vi, afterEach } from "vitest";

import { useSignalWatcher } from "../src/controllers/signal-watcher-controller";
import { useSignalProps } from "../src/extensions/signal-prop";

class PropTestHost extends TestHost {
	duration = 10;
	isRunning = false;
	readonly dispatched: CustomEvent[] = [];

	override dispatchEvent(event: Event): boolean {
		this.dispatched.push(event as CustomEvent);
		return true;
	}
}

function runHostWillLoad(host: TestHost): void {
	for (const ctrl of host.controllers) {
		ctrl.hostWillLoad?.();
	}
}

function runHostWillUpdate(host: TestHost): void {
	for (const ctrl of host.controllers) {
		ctrl.hostWillUpdate?.();
	}
}

describe("useSignalProps", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("throws without useSignalWatcher on connect", () => {
		const host = new PropTestHost();
		useSignalProps(PropTestHost)({ duration: {} });
		expect(() => host.connect()).toThrow(/useSignalProps requires useSignalWatcher\(\) declared before this field/);
	});

	it("syncs on hostWillLoad after connect", () => {
		const host = new PropTestHost();
		host.duration = 42;
		useSignalWatcher();
		const $props = useSignalProps(PropTestHost)({
			duration: { transform: (v: number) => Math.max(0, v) },
		});

		expect($props.duration()).toBe(42);

		host.connect();
		runHostWillLoad(host);
		expect($props.duration()).toBe(42);

		host.duration = 5;
		runHostWillUpdate(host);
		expect($props.duration()).toBe(5);
	});

	it("preserves snapshot on disconnect and stops syncing", () => {
		const host = new PropTestHost();
		host.duration = 10;
		useSignalWatcher();
		const $props = useSignalProps(PropTestHost)({ duration: {} });

		host.connect();
		runHostWillLoad(host);

		host.disconnect();
		host.duration = 99;
		runHostWillUpdate(host);
		expect($props.duration()).toBe(10);
		expect($props.duration.peek()).toBe(10);
	});

	it("resyncs on reconnect", () => {
		const host = new PropTestHost();
		host.duration = 10;
		useSignalWatcher();
		const $props = useSignalProps(PropTestHost)({ duration: {} });

		host.connect();
		runHostWillLoad(host);
		host.disconnect();

		host.duration = 25;
		host.connect();
		runHostWillLoad(host);
		expect($props.duration()).toBe(25);
	});

	it("twoWay dispatches Change event when connected", () => {
		const host = new PropTestHost();
		vi.spyOn(stencilCore, "getElement").mockReturnValue(host as unknown as HTMLStencilElement);

		useSignalWatcher();
		const $props = useSignalProps(PropTestHost)({ isRunning: { twoWay: true } });

		host.connect();
		runHostWillLoad(host);

		$props.isRunning.set(true);
		expect(host.dispatched.some(e => e.type === "isRunningChange" && e.detail === true)).toBeTruthy();

		host.disconnect();
		host.dispatched.length = 0;
		$props.isRunning.set(false);
		expect(host.dispatched).toHaveLength(0);
	});
});
