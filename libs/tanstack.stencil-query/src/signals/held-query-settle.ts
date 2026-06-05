import { computed, createWatcher } from "@ssv/stencil-signals";
import { hashKey } from "@tanstack/query-core";
import type { QueryClient, QueryKey } from "@tanstack/query-core";

import type { UseQueryOptions } from "../query-observer";

type HeldSettleContext<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = {
	qc: QueryClient;
	getOpts: () => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
	isHeld: (opts: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) => boolean;
	reArm: () => void;
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
 * Reactive SSR settle for a held (signal-derived) query key — the signals-layer implementation of
 * {@link HeldQuerySettle}, injected into `useBaseQueryObserver` by `$useQuery`. Lives here (not in
 * the shared observer base) so its `@ssv/stencil-signals` dependency stays out of the classic
 * `useQuery` bundle; see the "Signal-dependent queries & SSR" section of the README.
 *
 * Watches the query's reactive options and, once the key resolves, prefetches it once — superseding
 * (cancelling) an in-flight prefetch if the key changes again, and bailing out after a safety timeout.
 */
export const heldQuerySettle = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
	ctx: HeldSettleContext<TQueryFnData, TError, TData, TQueryKey>,
): { promise: Promise<void>; abort: () => void } => {
	const { qc, getOpts, isHeld, reArm, syncResult } = ctx;

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
		return { opts, disabled: opts.enabled === false, held: isHeld(opts) };
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

	readiness();
	watcher.watch(readiness);
	check();

	return { promise, abort };
};
