import { getLogger } from "@logtape/logtape";
import { useMutation, useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import type { DraftSession, Team } from "../lol.types";
import { BASE_URL } from "../shared/lol.constants";

const logger = getLogger(["lol", "draft"]);

const queryKey = (draftId: string) => ["lol-draft", draftId] as const;

async function fetchDraftSession(draftId: string): Promise<DraftSession> {
	const url = `${BASE_URL}/api/lol/drafts/${draftId}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch draft session: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

async function apiCreateDraft(): Promise<DraftSession> {
	const res = await fetch(`${BASE_URL}/api/lol/drafts`, { method: "POST" });
	if (!res.ok) {
		throw new Error(`Failed to create draft session: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

async function apiPick(draftId: string, championId: string, team: Team): Promise<DraftSession> {
	logger.debug("Sending pick: {championId} ({team})", { draftId, championId, team });
	const res = await fetch(`${BASE_URL}/api/lol/drafts/${draftId}/pick`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ championId, team }),
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Pick failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

async function apiBan(draftId: string, championId: string, team: Team): Promise<DraftSession> {
	logger.debug("Sending ban: {championId} ({team})", { draftId, championId, team });
	const res = await fetch(`${BASE_URL}/api/lol/drafts/${draftId}/ban`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ championId, team }),
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Ban failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

async function apiSimulateOpponent(draftId: string): Promise<DraftSession> {
	const res = await fetch(`${BASE_URL}/api/lol/drafts/${draftId}/simulate-opponent`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Simulate failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

// ── useCreateDraft ─────────────────────────────────────────────────────────────

export function useCreateDraft(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: apiCreateDraft,
			onSuccess: session => {
				client.current?.setQueryData(queryKey(session.id), session);
			},
		},
		queryClient,
	);
	return {
		get create() {
			return mutation();
		},
	};
}

// ── useDraftSession ────────────────────────────────────────────────────────────

export function useDraftSession(getDraftId: () => string | null, queryClient?: QueryClient) {
	const sessionRef = useQuery(() => {
		const id = getDraftId();
		if (!id) {
			return { queryKey: ["lol-draft", "__none__"] as const, enabled: false, queryFn: () => null };
		}
		// SSE (useDraftSSE) drives all invalidations — treat cached data as always fresh.
		return { queryKey: queryKey(id), queryFn: () => fetchDraftSession(id), staleTime: Infinity };
	}, queryClient);

	return {
		get session() {
			return sessionRef();
		},
	};
}

// ── useDraftMutations ──────────────────────────────────────────────────────────

export type PickArgs = {
	championId: string;
	team: Team;
};

export function useDraftMutations(getDraftId: () => string | null, queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	const pickRef = useMutation(
		{
			mutationFn: ({ championId, team }: PickArgs) => {
				const id = getDraftId();
				if (!id) {
					throw new Error("No active draft session");
				}
				return apiPick(id, championId, team);
			},
			onSuccess: session => {
				logger.info("Pick OK: phase={phase} turn={turn}", { phase: session.phase, turn: session.currentTurnIndex });
				client.current?.setQueryData(queryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Pick failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: queryKey(id) });
				}
			},
		},
		queryClient,
	);

	const banRef = useMutation(
		{
			mutationFn: ({ championId, team }: PickArgs) => {
				const id = getDraftId();
				if (!id) {
					throw new Error("No active draft session");
				}
				return apiBan(id, championId, team);
			},
			onSuccess: session => {
				logger.info("Ban OK: phase={phase} turn={turn}", { phase: session.phase, turn: session.currentTurnIndex });
				client.current?.setQueryData(queryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Ban failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: queryKey(id) });
				}
			},
		},
		queryClient,
	);

	const simulateRef = useMutation(
		{
			mutationFn: () => {
				const id = getDraftId();
				if (!id) {
					throw new Error("No active draft session");
				}
				return apiSimulateOpponent(id);
			},
			onSuccess: session => {
				logger.info("Simulate-opponent OK: phase={phase} turn={turn}", {
					phase: session.phase,
					turn: session.currentTurnIndex,
				});
				client.current?.setQueryData(queryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Simulate-opponent failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: queryKey(id) });
				}
			},
		},
		queryClient,
	);

	return {
		get pick() {
			return pickRef();
		},
		get ban() {
			return banRef();
		},
		get simulate() {
			return simulateRef();
		},
	};
}

// ── useJoinDraft ───────────────────────────────────────────────────────────────

async function apiJoinDraft(draftId: string): Promise<DraftSession> {
	const res = await fetch(`${BASE_URL}/api/lol/drafts/${draftId}/join`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Join failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export function useJoinDraft(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: (draftId: string) => apiJoinDraft(draftId),
			onSuccess: session => {
				client.current?.setQueryData(queryKey(session.id), session);
			},
		},
		queryClient,
	);
	return {
		get join() {
			return mutation();
		},
	};
}

// ── useEnableSimulation ────────────────────────────────────────────────────────

async function apiEnableSimulation(draftId: string): Promise<DraftSession> {
	const res = await fetch(`${BASE_URL}/api/lol/drafts/${draftId}/simulation/enable`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Enable simulation failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export function useEnableSimulation(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: (draftId: string) => apiEnableSimulation(draftId),
			onSuccess: session => {
				logger.info("Simulation enabled: id={id}", { id: session.id });
				client.current?.setQueryData(queryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Enable simulation failed: {error}", { error: String(err) });
			},
		},
		queryClient,
	);
	return {
		get enable() {
			return mutation();
		},
	};
}
