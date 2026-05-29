import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { describe, it, expect, vi } from "vitest";

import { SignalWatcherController } from "../src/controllers/signal-watcher-controller";
import { linkedSignal } from "../src/extensions/linked-signal";
import { signal, computed } from "../src/tc39";

// Helper: flush all pending microtasks
const tick = () =>
	new Promise<void>(r => {
		queueMicrotask(r);
	});

// Force a full GC without the `--expose-gc` launch flag (no vitest.config change).
// Returns null if the runtime forbids the vm trick, so the leak suite can skip.
const forceGc: (() => void) | null = (() => {
	try {
		setFlagsFromString("--expose_gc");
		return runInNewContext("gc") as () => void;
	} catch {
		return null;
	}
})();

// Macrotask yield — required between dropping refs and GC for reliable collection.
const settle = () =>
	new Promise<void>(r => {
		setImmediate(r);
	});

// Poll: yield + GC up to a few passes, report whether the ref was collected.
async function isCollected(ref: WeakRef<object>): Promise<boolean> {
	for (let i = 0; i < 10 && ref.deref() !== undefined; i++) {
		// oxlint-disable-next-line no-await-in-loop -- GC polling is inherently sequential
		await settle();
		forceGc!();
	}
	return ref.deref() === undefined;
}

// Minimal host whose render() genuinely reads a signal — drives the real
// SignalWatcherController without TestHost's render-is-lifecycle-driver recursion.
// The controller is constructed directly (no use()), so it only ever touches
// host.render and host.requestUpdate.
function makeHost(render: () => unknown, onRequestUpdate?: () => void) {
	return {
		requestUpdate() {
			onRequestUpdate?.();
		},
		render,
	};
}

describe("linkedSignal", () => {
	it("initial value is computation(source)", () => {
		const source = signal(2);
		const doubled = linkedSignal({ source: () => source(), computation: n => n * 2 });

		expect(doubled()).toBe(4);
	});

	it("is writable: set() overrides and persists", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });

		value.set(100);
		expect(value()).toBe(100);
		expect(value()).toBe(100);
	});

	it("resets to recomputed value when the source changes (discards local write)", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });

		value.set(100);
		expect(value()).toBe(100);

		source.set(5);
		expect(value()).toBe(10);
	});

	it("explicit form: previous receives { source, value } of the prior state", () => {
		const source = signal("a");
		const seen: ({ source: string; value: string } | undefined)[] = [];

		const value = linkedSignal({
			source: () => source(),
			computation: (s, previous) => {
				seen.push(previous);
				return `${s}!`;
			},
		});

		expect(value()).toBe("a!"); // first run: previous === undefined

		source.set("b");
		expect(value()).toBe("b!"); // previous reflects prior state

		expect(seen[0]).toBeUndefined();
		expect(seen[1]).toStrictEqual({ source: "a", value: "a!" });
	});

	it("explicit form: previous reflects a local write before a source change", () => {
		const source = signal("a");
		let captured: { source: string; value: string } | undefined;

		const value = linkedSignal({
			source: () => source(),
			computation: (s, previous) => {
				captured = previous;
				return `${s}!`;
			},
		});

		expect(value()).toBe("a!");
		value.set("override");

		source.set("b");
		expect(value()).toBe("b!");
		expect(captured).toStrictEqual({ source: "a", value: "override" });
	});

	it("update() applies after a reset", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });

		value.update(n => n + 1);
		expect(value()).toBe(5); // 4 -> 5

		source.set(10);
		value.update(n => n + 1); // reset to 20 first, then +1
		expect(value()).toBe(21);
	});

	it("simple form: resets when the dependency changes, still writable", () => {
		const dep = signal(1);
		const value = linkedSignal(() => dep());

		expect(value()).toBe(1);

		value.set(99);
		expect(value()).toBe(99);

		dep.set(2);
		expect(value()).toBe(2);
	});

	it("equal option suppresses dependent recompute when recomputed value is equal", () => {
		const source = signal({ id: 1, label: "a" });
		const value = linkedSignal({
			source: () => source(),
			computation: s => ({ id: s.id }),
			equal: (a, b) => a.id === b.id,
		});

		const spy = vi.fn();
		const dependent = computed(() => {
			spy();
			return value().id;
		});

		expect(dependent()).toBe(1);
		expect(spy).toHaveBeenCalledOnce();

		// Source changes but derived id stays the same -> equal suppresses change.
		source.set({ id: 1, label: "b" });
		expect(dependent()).toBe(1);
		expect(spy).toHaveBeenCalledOnce();

		// Genuine change.
		source.set({ id: 2, label: "c" });
		expect(dependent()).toBe(2);
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it("set wins: write after a source change returns the set value, next change still resets", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });

		// Change source then set() before reading.
		source.set(5);
		value.set(100);
		expect(value()).toBe(100);

		// A subsequent genuine source change still resets.
		source.set(7);
		expect(value()).toBe(14);
	});

	it("is reactive: a computed reading it re-runs on change", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });
		const plusOne = computed(() => value() + 1);

		expect(plusOne()).toBe(5);

		value.set(10);
		expect(plusOne()).toBe(11);

		source.set(20);
		expect(plusOne()).toBe(41);
	});

	it("is reactive: an effect reading it re-runs on change", async () => {
		const { effect } = await import("../src/extensions/effect");
		const source = signal(1);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });

		const spy = vi.fn();
		const ref = effect(() => {
			spy(value());
		});
		await tick();
		expect(spy).toHaveBeenLastCalledWith(2);

		source.set(5);
		await tick();
		expect(spy).toHaveBeenLastCalledWith(10);

		value.set(99);
		await tick();
		expect(spy).toHaveBeenLastCalledWith(99);

		ref.dispose();
	});

	it("asReadonly() returns a read-only view", () => {
		const source = signal(2);
		const value = linkedSignal({ source: () => source(), computation: n => n * 2 });
		const readonly = value.asReadonly();

		expect(readonly()).toBe(4);
		expect("set" in readonly).toBeFalsy();

		value.set(50);
		expect(readonly()).toBe(50);
	});
});

describe("linkedSignal — memory", () => {
	// While a component is connected, the SignalWatcherController watches a Computed
	// wrapping render(), establishing a strong producer→consumer chain:
	//   source (State) → linked.out (Computed) → renderComputed → Watcher
	// Disposing the watcher on hostDisconnected() must tear that chain so a long-lived
	// source no longer pins the destroyed component's linkedSignal.

	it.skipIf(!forceGc)("is collected after the consuming component is destroyed (source stays alive)", async () => {
		const source = signal(2); // long-lived, in scope for the whole test

		// Build + destroy a component inside a fn so every strong ref leaves scope.
		const ref = await (async (): Promise<WeakRef<object>> => {
			const linked = linkedSignal({ source: () => source(), computation: n => n * 2 });
			const weak = new WeakRef(linked as object);

			let scheduled = 0;
			const host = makeHost(
				() => linked(),
				() => {
					scheduled++;
				},
			);
			const ctrl = new SignalWatcherController(host as never);
			ctrl.hostConnected();
			await tick(); // let setActiveOwner(null) microtask run
			ctrl.hostWillRender(); // establish source → linked → renderComputed → watcher

			expect(linked()).toBe(4); // sanity
			source.set(3);
			await tick(); // watcher notify → scheduler drains → requestUpdate
			expect(scheduled).toBeGreaterThan(0); // proves the watched edge is live
			expect(linked()).toBe(6); // source change reset it

			ctrl.hostDisconnected();
			await tick(); // disconnect's queueMicrotask → watcher.dispose()
			return weak; // linked, host, ctrl all leave scope here
		})();

		await expect(isCollected(ref)).resolves.toBeTruthy();

		// source untouched + still usable.
		const fresh = linkedSignal({ source: () => source(), computation: n => n * 2 });
		expect(fresh()).toBe(6); // source === 3
	});

	// Negative control: proves the test above isn't passing trivially. Drop all local
	// refs WITHOUT disconnecting; the still-live source transitively retains the
	// linkedSignal, so GC must NOT collect it.
	it.skipIf(!forceGc)("a connected component's linkedSignal is retained by its live source", async () => {
		const source = signal(2);
		const ref = await (async (): Promise<WeakRef<object>> => {
			const linked = linkedSignal({ source: () => source(), computation: n => n * 2 });
			const weak = new WeakRef(linked as object);
			const host = makeHost(() => linked());
			const ctrl = new SignalWatcherController(host as never);
			ctrl.hostConnected();
			await tick();
			ctrl.hostWillRender(); // watched, NOT disconnected
			return weak; // drop linked/host/ctrl, keep `source` alive
		})();

		await expect(isCollected(ref)).resolves.toBeFalsy(); // live source still pins it (strongly reachable)
	});
});
