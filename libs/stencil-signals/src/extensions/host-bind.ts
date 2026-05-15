/**
 * @ssv/stencil-signals — extensions/host-bind.ts
 *
 * Shared host lifecycle for `use*` utilities. Connect/reconnect orchestration
 * and state snapshots live here; disposal is delegated to
 * `SignalWatcherController` via `getActiveOwner()` registration in core factories.
 */

import { use } from "@ssv/stencil.core";

import { getActiveOwner } from "../signals/core";
import type { WatcherRef } from "./effect";

// ─── Active-owner guard ───────────────────────────────────────────────────────

function assertRegisteredWithActiveOwner(utilityName: string, cleanupsBefore: number): void {
	const owner = getActiveOwner();
	if (!owner || owner.length <= cleanupsBefore) {
		throw new Error(`${utilityName} requires useSignalWatcher() declared before this field.`);
	}
}

// ─── Shared lifecycle controller ──────────────────────────────────────────────

type HostLifecycleHandlers = {
	onConnect(): void;
	onDisconnect(): void;
};

function registerHostLifecycle(handlers: HostLifecycleHandlers): void {
	use({
		hostConnected(): void {
			handlers.onConnect();
		},
		hostDisconnected(): void {
			handlers.onDisconnect();
		},
	});
}

// ─── bindToHostDisposable ─────────────────────────────────────────────────────

export type HostBoundDisposable<TSnapshot> = {
	(): TSnapshot;
	peek(): TSnapshot;
	dispose(): void;
};

export function bindToHostDisposable<TSnapshot, TInner>(config: {
	utilityName: string;
	initialSnapshot: TSnapshot;
	create: (snapshot: TSnapshot) => TInner;
	read: (inner: TInner) => TSnapshot;
	peek: (inner: TInner) => TSnapshot;
	disposeInner: (inner: TInner) => void;
}): HostBoundDisposable<TSnapshot> {
	let inner: TInner | null = null;
	let snapshot = config.initialSnapshot;
	let manuallyDisposed = false;

	const wrapper = Object.assign((): TSnapshot => (inner === null ? snapshot : config.read(inner)), {
		peek(): TSnapshot {
			return inner === null ? snapshot : config.peek(inner);
		},
		dispose(): void {
			if (manuallyDisposed) {
				return;
			}
			manuallyDisposed = true;
			if (inner !== null) {
				snapshot = config.peek(inner);
				config.disposeInner(inner);
				inner = null;
			}
		},
	}) as HostBoundDisposable<TSnapshot>;

	registerHostLifecycle({
		onConnect(): void {
			if (manuallyDisposed || inner !== null) {
				return;
			}
			const cleanupsBefore = getActiveOwner()?.length ?? 0;
			inner = config.create(snapshot);
			assertRegisteredWithActiveOwner(config.utilityName, cleanupsBefore);
		},
		onDisconnect(): void {
			if (inner !== null) {
				snapshot = config.peek(inner);
				inner = null;
			}
		},
	});

	return wrapper;
}

// ─── bindToHostEffect ─────────────────────────────────────────────────────────

export function bindToHostEffect(config: { utilityName: string; create: () => WatcherRef }): WatcherRef {
	let inner: WatcherRef | null = null;
	let manuallyDisposed = false;

	const ref: WatcherRef = {
		dispose(): void {
			if (manuallyDisposed) {
				return;
			}
			manuallyDisposed = true;
			inner?.dispose();
			inner = null;
		},
	};

	registerHostLifecycle({
		onConnect(): void {
			if (manuallyDisposed || inner !== null) {
				return;
			}
			const cleanupsBefore = getActiveOwner()?.length ?? 0;
			inner = config.create();
			assertRegisteredWithActiveOwner(config.utilityName, cleanupsBefore);
		},
		onDisconnect(): void {
			if (inner !== null) {
				inner.dispose();
				inner = null;
			}
		},
	});

	return ref;
}

// ─── bindToHostProps ──────────────────────────────────────────────────────────

/** Mutable snapshot store shared between `bindToHostProps` and stable prop facades. */
export type HostPropsSnapshotBag = { values: Record<string, unknown> };

export function bindToHostProps<TProps extends Record<string, unknown>>(config: {
	utilityName: string;
	snapshotBag: HostPropsSnapshotBag;
	/** Stable prop facades returned to the caller. */
	props: TProps;
	/** Capture live prop values into the snapshot bag on disconnect. */
	snapshotFromProps: (props: TProps) => Record<string, unknown>;
	/** Register inner state and return dispose fn (pushed to active owner by caller). */
	create: () => () => void;
}): TProps {
	let disposeFn: (() => void) | null = null;

	registerHostLifecycle({
		onConnect(): void {
			if (disposeFn !== null) {
				return;
			}
			const cleanupsBefore = getActiveOwner()?.length ?? 0;
			disposeFn = config.create();
			assertRegisteredWithActiveOwner(config.utilityName, cleanupsBefore);
		},
		onDisconnect(): void {
			if (disposeFn === null) {
				return;
			}
			config.snapshotBag.values = config.snapshotFromProps(config.props);
			disposeFn = null;
		},
	});

	return config.props;
}
