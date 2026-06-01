import type { ReactiveController } from "./reactive-controller";

/**
 * All lifecycle hook names a {@link ReactiveController} may implement, in invocation order.
 *
 * Drives the per-hook bucketing in {@link reactiveController}: a controller is only ever
 * iterated for hooks it actually implements.
 */
const HOOK_NAMES = [
	"hostConnected",
	"hostDisconnected",
	"hostWillLoad",
	"hostDidLoad",
	"hostWillRender",
	"hostDidRender",
	"hostWillUpdate",
	"hostDidUpdate",
] as const;

/** Union of every {@link ReactiveController} lifecycle hook name. */
type HookName = (typeof HOOK_NAMES)[number];

/** Hooks that may return a `Promise` to defer the corresponding lifecycle phase. */
type AsyncHookName = "hostWillLoad" | "hostWillRender" | "hostWillUpdate";

/** Per-hook controller buckets. Entries are created lazily on first use. */
type Buckets = Partial<Record<HookName, Set<ReactiveController>>>;

/**
 * Module-level dispatch helpers — avoids allocating two closures per {@link reactiveController} call.
 */
function runSync(buckets: Buckets, hook: Exclude<HookName, AsyncHookName>): void {
	const bucket = buckets[hook];
	if (!bucket) {
		return;
	}
	for (const controller of bucket) {
		const fn = controller[hook];
		fn?.call(controller);
	}
}

function runAsync(buckets: Buckets, hook: AsyncHookName): Promise<void> | void {
	const bucket = buckets[hook];
	if (!bucket || bucket.size === 0) {
		return;
	}
	let promises: Promise<void>[] | undefined;
	for (const controller of bucket) {
		const fn = controller[hook];
		const result = fn?.call(controller);
		if (result) {
			(promises ??= []).push(result);
		}
	}
	if (promises) {
		return Promise.all(promises).then();
	}
}

/**
 * Reusable controller registry + lifecycle dispatcher — the shared core behind
 * {@link ReactiveControllerHostMixin} and the test hosts.
 *
 * Hosts delegate to this ref instead of re-implementing the controller `Set` and the
 * eight lifecycle fan-out loops, so the behavior lives in exactly one place.
 *
 * Returned by {@link reactiveController}.
 */
export type ReactiveControllerRef = {
	/** Live set of registered controllers. Exposed for host introspection (e.g. tests). */
	readonly controllers: ReadonlySet<ReactiveController>;
	/** Registers a controller and indexes the hooks it implements. Idempotent. */
	add(controller: ReactiveController): void;
	/** Unregisters a controller from every hook index. */
	remove(controller: ReactiveController): void;
	/** Dispatches `hostConnected` to controllers that implement it. */
	connected(): void;
	/** Dispatches `hostDisconnected` to controllers that implement it. */
	disconnected(): void;
	/** Dispatches `hostWillLoad`, awaiting any returned promises in parallel. */
	willLoad(): Promise<void> | void;
	/** Dispatches `hostDidLoad` to controllers that implement it. */
	didLoad(): void;
	/** Dispatches `hostWillRender`, awaiting any returned promises in parallel. */
	willRender(): Promise<void> | void;
	/** Dispatches `hostDidRender` to controllers that implement it. */
	didRender(): void;
	/** Dispatches `hostWillUpdate`, awaiting any returned promises in parallel. */
	willUpdate(): Promise<void> | void;
	/** Dispatches `hostDidUpdate` to controllers that implement it. */
	didUpdate(): void;
};

/**
 * Creates a {@link ReactiveControllerRef}: a small, framework-agnostic engine that owns the
 * controller `Set` and fans lifecycle calls out to the registered controllers.
 *
 * **Performance** — controllers are bucketed per hook on registration. Each dispatch iterates
 * only the controllers that implement that specific hook, so unimplemented hooks cost nothing.
 * Buckets are allocated lazily — only created when the first controller implementing a given
 * hook is registered, so components with few controllers pay no upfront allocation cost.
 *
 * @example
 * ```ts
 * const ref = reactiveController();
 * ref.add({ hostConnected() { ... } });
 * ref.connected(); // runs hostConnected on the one controller that implements it
 * ```
 */
export function reactiveController(): ReactiveControllerRef {
	const controllers = new Set<ReactiveController>();
	// Buckets are created lazily — only allocated when the first controller implementing
	// a given hook is registered. Components with few controllers pay no allocation cost.
	const buckets: Buckets = {};

	return {
		controllers,
		add(controller: ReactiveController): void {
			if (controllers.has(controller)) {
				return;
			}
			controllers.add(controller);
			for (const hook of HOOK_NAMES) {
				if (typeof controller[hook] === "function") {
					(buckets[hook] ??= new Set()).add(controller);
				}
			}
		},
		remove(controller: ReactiveController): void {
			if (!controllers.delete(controller)) {
				return;
			}
			for (const hook of HOOK_NAMES) {
				buckets[hook]?.delete(controller);
			}
		},
		connected: () => runSync(buckets, "hostConnected"),
		disconnected: () => runSync(buckets, "hostDisconnected"),
		willLoad: () => runAsync(buckets, "hostWillLoad"),
		didLoad: () => runSync(buckets, "hostDidLoad"),
		willRender: () => runAsync(buckets, "hostWillRender"),
		didRender: () => runSync(buckets, "hostDidRender"),
		willUpdate: () => runAsync(buckets, "hostWillUpdate"),
		didUpdate: () => runSync(buckets, "hostDidUpdate"),
	};
}
