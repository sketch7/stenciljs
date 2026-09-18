import { computed, createWatcher } from "@ssv/stencil-signals";
import { hashKey } from "@tanstack/query-core";
import type { QueryClient, QueryKey, QueryObserver } from "@tanstack/query-core";

import type { AnyQueriesOptions } from "../queries-observer";
import { isQueryKeyHeld } from "../query-observer";
import type { UseQueryOptions } from "../query-observer";

export type ServerQuerySettleContext<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	qc: QueryClient;
	getOpts: () => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
	reArm: () => void;
	getObserver: () => QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey> | undefined;
	syncResult: () => void;
};

/**
 * Upper bound on how long the SSR settle waits for a held query's key to resolve before giving up
 * and rendering without it. A held query whose key never resolves (e.g. a permanently-undefined
 * upstream) must not block `componentWillLoad` indefinitely — the outer SSR worker timeout is the
 * final backstop, but this keeps a single stuck query from monopolising the render budget.
 */
const SSR_HELD_QUERY_TIMEOUT_MS = 15_000;

/**
 * Pure factory: reactive SSR settle covering BOTH held (signal-derived, undefined key) and
 * non-held (immediate prefetch) query keys. The base (`useBaseQueryObserver`) invokes this inside
 * `hostWillLoad` via the injected `onServerRender` handler and owns the lifecycle wiring
 * (`hostDisconnected → abort()`). This factory has no `use()` lifecycle block and does NOT call
 * `detectServer()` — the base already gates server-only.
 *
 * - Non-held: `check()` fires synchronously on creation, prefetches immediately, then resolves.
 * - Held: waits reactively until the key resolves, then prefetches once.
 * - `enabled:false`: resolves immediately without prefetch; signal stays pending.
 *
 * Uses `createWatcher` (rather than the host-aware `effect`) because this factory is called during
 * `hostWillLoad` where the host context may still be active — `createWatcher` has no
 * host-binding requirement and is safe to create at any lifecycle phase.
 *
 * Lives in `signals/` so the `@ssv/stencil-signals` dependency stays out of the classic
 * `useQuery` bundle.
 */
export const createServerQuerySettle = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	ctx: ServerQuerySettleContext<TQueryFnData, TError, TData, TQueryKey>,
): { promise: Promise<void>; abort: () => void } => {
	const { qc, getOpts, reArm, syncResult } = ctx;

	let done = false;
	// The prefetch currently in flight: `hash` to detect same-key re-entrancy, `key` for identity.
	// A re-fired check for the same key is ignored; a newer key supersedes it (settleIfLatest guards).
	let inflight: { hash: string; key: TQueryKey } | undefined;
	let resolveSettle!: () => void;
	const promise = new Promise<void>(resolve => {
		resolveSettle = resolve;
	});

	const readiness = computed(() => {
		const opts = getOpts();
		return { opts, disabled: opts.enabled === false, held: isQueryKeyHeld(opts.queryKey) };
	});

	const finish = (): void => {
		if (done) {
			return;
		}
		done = true;
		watcher.dispose();
		clearTimeout(timer);
		resolveSettle();
	};

	const check = (): void => {
		if (done) {
			return;
		}
		const { opts, disabled, held } = readiness();
		if (disabled) {
			finish();
			return;
		}
		if (held) {
			return;
		}

		const keyHash = hashKey(opts.queryKey);
		if (inflight?.hash === keyHash) {
			// Already prefetching this exact key — ignore the re-entrant check.
			return;
		}
		inflight = { hash: keyHash, key: opts.queryKey };
		reArm();
		// Settle only if this prefetch is still the current one — a prefetch superseded by a newer key
		// (inflight moved on) must not resolve the SSR wait.
		const settleIfLatest = (): void => {
			if (!done && inflight?.hash === keyHash) {
				finish();
			}
		};
		qc.prefetchQuery(opts).then(syncResult).then(settleIfLatest, settleIfLatest);
	};

	// Use `createWatcher` (not the host-aware `effect`) so the factory is safe to call during
	// `hostWillLoad` regardless of whether the host context is still active. The TC39 Watcher
	// fires when `readiness` changes; queueMicrotask defers re-arm past the notification phase
	// (TC39: watcher.watch() is forbidden inside the notify callback).
	const watcher = createWatcher(() => queueMicrotask(check));

	const timer = setTimeout(() => {
		if (done) {
			return;
		}
		console.error(
			`[ssv:query] held query timed out after ${SSR_HELD_QUERY_TIMEOUT_MS}ms during SSR — its ` +
				`key never resolved, so it is excluded from the server-rendered output. ` +
				`queryKey: ${JSON.stringify(getOpts().queryKey)}`,
		);
		finish();
	}, SSR_HELD_QUERY_TIMEOUT_MS);

	// Disconnect mid-wait: tear the settle down immediately.
	const abort = (): void => {
		finish();
	};

	// Seed initial watch and run the first check synchronously.
	readiness();
	watcher.watch(readiness);
	check();

	return { promise, abort };
};

/**
 * Thin wrapper that creates one {@link createServerQuerySettle} per element in the queries array,
 * then resolves when all elements have settled. Applies the D1 correction: per-element reArm is a
 * no-op — the whole-array reArm is called once after all elements have settled.
 *
 * Lives in `signals/` so the `@ssv/stencil-signals` dependency stays out of the classic
 * `useQueries` bundle.
 */
export const createServerQueriesSettle = (ctx: {
	qc: QueryClient;
	getOpts: () => AnyQueriesOptions;
	reArm: () => void;
	syncResult: () => void;
}): { promise: Promise<void>; abort: () => void } => {
	// Apply the whole-array reArm once up front — mirrors the per-element reArm in
	// createServerQuerySettle which is called before qc.prefetchQuery. Calling it
	// after the prefetches would see stale (staleTime=0) cached data and trigger
	// spurious re-fetches. Per-element reArms are no-ops (D1) to avoid N× setQueries.
	ctx.reArm();

	const settles = ctx.getOpts().queries.map((_q, i) =>
		createServerQuerySettle({
			qc: ctx.qc,
			getOpts: () => ctx.getOpts().queries[i] as never,
			// oxlint-disable-next-line no-empty-function -- D1: per-element no-op; whole-array reArm already applied above to avoid N× setQueries
			reArm: () => {},
			getObserver: () => undefined, // unused by the settle
			syncResult: ctx.syncResult, // cheap, idempotent whole-array re-read (progressive sync)
		} as never),
	);
	return {
		// oxlint-disable-next-line typescript/promise-function-async -- .then() callback returns void; the outer property holds the Promise<void>
		promise: Promise.all(settles.map(s => s.promise)).then(() => {
			ctx.syncResult();
		}),
		abort: () => settles.forEach(s => s.abort()),
	};
};
