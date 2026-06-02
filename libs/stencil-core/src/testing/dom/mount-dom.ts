import { clearCurrentHost, setCurrentHost } from "../../hooks/host-context";
import { DomTestHost } from "./dom-test-host";

/**
 * Connection order for {@link mountDom}.
 * - `"default"` — pre-order (parent connects first). Mirrors SSR render and client navigation.
 * - `"hydrate"` — post-order (deepest child connects first; sets `s-id` on all nodes).
 *   Mirrors SSR→client DSD hydration.
 */
export type DomTestMode = "default" | "hydrate";

/**
 * Tree returned by {@link mountDom}. Implements `Disposable` for use with `using`.
 *
 * `[Symbol.dispose]` disconnects all nodes post-order, removes the root from the DOM.
 */
export type DomTestTree<T = void> = {
	/** The root `DomTestHost`. */
	readonly host: DomTestHost;
	/** Value returned by the root setup callback. */
	readonly result: T;
} & Disposable;

/**
 * Builder node passed to setup callbacks in {@link mountDom}.
 * Register hooks directly (they bind to this node's host via `currentHost`),
 * and call `child()` to attach child nodes.
 */
export type DomTreeNode = {
	/** The `DomTestHost` for this node. */
	readonly host: DomTestHost;
	/**
	 * Registers a child node under this one.
	 * Hooks inside `setup` bind to the child's host.
	 * Returns whatever `setup` returns.
	 */
	child: <T>(setup: (node: DomTreeNode) => T) => T;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

type InternalNode = {
	readonly host: DomTestHost;
	readonly children: InternalNode[];
};

class DomTreeNodeImpl implements DomTreeNode {
	readonly #node: InternalNode;

	get host(): DomTestHost {
		return this.#node.host;
	}

	constructor(node: InternalNode) {
		this.#node = node;
	}

	child<T>(setup: (node: DomTreeNode) => T): T {
		const childHost = new DomTestHost(); // calls setCurrentHost(childHost)
		const childInternal: InternalNode = { host: childHost, children: [] };
		this.#node.children.push(childInternal);
		const childNode = new DomTreeNodeImpl(childInternal);
		const result = setup(childNode);
		setCurrentHost(this.#node.host); // restore parent context
		return result;
	}
}

function appendTree(node: InternalNode): void {
	for (const child of node.children) {
		node.host.append(child.host);
		appendTree(child);
	}
}

let hydrationCounter = 0;

function markHydrating(node: InternalNode): void {
	(node.host as unknown as Record<string, unknown>)["s-id"] = String(++hydrationCounter);
	for (const child of node.children) {
		markHydrating(child);
	}
}

function connectPreOrder(node: InternalNode): void {
	node.host.connect();
	for (const child of node.children) {
		connectPreOrder(child);
	}
}

function connectPostOrder(node: InternalNode): void {
	for (const child of node.children) {
		connectPostOrder(child);
	}
	node.host.connect();
}

function collectNodes(node: InternalNode): InternalNode[] {
	return [node, ...node.children.flatMap(collectNodes)];
}

function disconnectPostOrder(node: InternalNode): void {
	for (const child of node.children) {
		disconnectPostOrder(child);
	}
	node.host.disconnect();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds a hierarchical DOM tree of `DomTestHost` elements, connects all nodes
 * in the specified order, and runs `willLoad` on all.
 * Returns a `using`-compatible `DomTestTree`.
 *
 * @example
 * ```ts
 * it.each([
 *   { label: "top-down",  mode: "default" as const },
 *   { label: "bottom-up", mode: "hydrate" as const },
 * ])("$label: consumer resolves context", async ({ mode }) => {
 *   let ref!: ContextRef<{ id: number }>;
 *   using tree = await mountDom(n => {
 *     provideContext(Ctx, { id: 42 });
 *     n.child(() => { ref = useContext(Ctx); });
 *   }, { mode });
 *   expect(ref.current).toStrictEqual({ id: 42 });
 * }); // auto: disconnect all + DOM removal
 * ```
 *
 * @example
 * ```ts
 * // Deep tree: root → child1 [gc1, gc2], child2
 * using tree = await mountDom(root => {
 *   provideContext(Ctx, value);
 *   root.child(c1 => {
 *     const ref = useContext(Ctx);
 *     c1.child(() => { /* grandchild 1 *\/ });
 *     c1.child(() => { /* grandchild 2 *\/ });
 *     return ref;
 *   });
 *   root.child(() => { /* child2 *\/ });
 * });
 * ```
 */
export async function mountDom<T = void>(
	setup: (node: DomTreeNode) => T,
	options?: { mode?: DomTestMode },
): Promise<DomTestTree<T>> {
	const mode = options?.mode ?? "default";
	const rootHost = new DomTestHost(); // setCurrentHost(rootHost)
	const rootInternal: InternalNode = { host: rootHost, children: [] };
	const rootNode = new DomTreeNodeImpl(rootInternal);

	const result = setup(rootNode);
	clearCurrentHost();

	// Build DOM tree
	document.body.append(rootHost);
	appendTree(rootInternal);

	// Connect in specified order
	if (mode === "hydrate") {
		markHydrating(rootInternal);
		connectPostOrder(rootInternal);
	} else {
		connectPreOrder(rootInternal);
	}

	// willLoad all nodes in parallel
	await Promise.all(collectNodes(rootInternal).map(async n => n.host.willLoad()));

	return {
		host: rootHost,
		result,
		[Symbol.dispose](): void {
			disconnectPostOrder(rootInternal);
			rootHost.remove();
		},
	};
}
