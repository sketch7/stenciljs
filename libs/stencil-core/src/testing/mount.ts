import { clearCurrentHost } from "../hooks/host-context";
import { TestHost } from "./test-host";

/** Options for {@link mount}. `TMounted` is the type received by `afterConnect`. */
export type MountOptions<THost extends TestHost, TMounted = THost> = {
	/** Custom host factory. Defaults to `new TestHost()`. */
	hostFactory?: () => THost;
	/**
	 * Called after `connect()` but before `willLoad()`. Use for assertions that require the
	 * connected state before any async loading begins (e.g. checking `isPending`/`isLoading`
	 * before a query observer is created).
	 *
	 * @example
	 * ```ts
	 * using m = await mount(
	 *   () => ({ query: useQuery({ queryKey: ["x"], queryFn: fetchFn }, qc) }),
	 *   { afterConnect: (mounted) => expect(mounted.query().isLoading).toBeTruthy() },
	 * );
	 * expect(m.query().isLoading).toBeFalsy();
	 * ```
	 */
	afterConnect?: (mounted: TMounted) => void | Promise<void>;
};

/** @internal */
type MountReturn<T, THost extends TestHost> = T extends object ? T & THost : THost;

/**
 * Creates a host, registers hooks via the setup callback, then runs the full Stencil
 * lifecycle (`connect → willLoad → render`). Returns the host as a `using`-compatible resource.
 *
 * `[Symbol.dispose]` calls `disconnect()` then `dispose()` — no manual cleanup needed.
 *
 * When the setup callback returns an object `T`, its properties are merged onto the host and
 * the result is typed as `T & THost` — no `let value!: ReturnType<...>` declarations needed.
 *
 * @example
 * ```ts
 * // Inferred type — no ReturnType annotation needed:
 * using m = await mount(() => ({
 *   query: useQuery({ queryKey: ["x"], queryFn: vi.fn() }, qc),
 * }));
 * expect(m.query().data).toBe(42);
 * expect(m.renderCount).toBe(1); // TestHost methods available directly
 * ```
 *
 * @example
 * ```ts
 * // Void setup returns THost directly (unchanged behaviour):
 * using host = await mount(() => {
 *   useQuery({ queryKey: ["x"], queryFn: vi.fn() }, qc);
 * });
 * expect(host.renderCount).toBe(1);
 * ```
 *
 * @example
 * ```ts
 * // With a custom host subclass:
 * class ComponentLike extends TestHost {
 *   readonly query = useQuery({ queryKey: ["sub"], queryFn: vi.fn() }, qc);
 * }
 * using comp = await mount(() => {}, { hostFactory: () => new ComponentLike() });
 * expect(comp.query().isPending).toBe(true);
 * ```
 */
export async function mount<T extends object | void, THost extends TestHost = TestHost>(
	setup: (host: THost) => T,
	options?: MountOptions<THost, MountReturn<T, THost>>,
): Promise<MountReturn<T, THost>> {
	const host = options?.hostFactory?.() ?? (new TestHost() as THost);
	const result = setup(host);
	if (result !== null && result !== undefined && typeof result === "object") {
		Object.assign(host, result);
	}
	clearCurrentHost();
	host.connect();
	await options?.afterConnect?.(host as unknown as MountReturn<T, THost>);
	await host.willLoad();
	host.render();
	host.didLoad();
	return host as unknown as MountReturn<T, THost>;
}
