import { getLogger } from "@logtape/logtape";
import { useMutation, useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import {
	apiCreateDraft,
	apiBan,
	apiEnableSimulation,
	apiJoinDraft,
	apiPick,
	apiSimulateOpponent,
	fetchDraftSession,
	DRAFTS_QUERY_KEY,
	fetchDraftList,
} from "./draft.client";

import type { DraftSession, Team } from "#/api";

const logger = getLogger(["lol", "draft"]);

export const draftQueryKey = (draftId: string) => ["lol-draft", draftId] as const;

export { DRAFTS_QUERY_KEY };

// ── useListDrafts ──────────────────────────────────────────────────────────────

export function useListDrafts(queryClient?: QueryClient) {
	const listRef = useQuery(
		() => ({
			queryKey: DRAFTS_QUERY_KEY,
			queryFn: fetchDraftList,
			// SSE (useLobbySSE) drives all invalidations — treat cached data as always fresh.
			staleTime: Infinity,
		}),
		queryClient,
	);
	return {
		get list() {
			return listRef();
		},
	};
}

// ── useCreateDraft ─────────────────────────────────────────────────────────────

export function useCreateDraft(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: apiCreateDraft,
			onSuccess: (session: DraftSession) => {
				client.current?.setQueryData(draftQueryKey(session.id), session);
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
		return { queryKey: draftQueryKey(id), queryFn: () => fetchDraftSession(id), staleTime: Infinity };
	}, queryClient);

	return {
		get session() {
			return sessionRef();
		},
	};
}

// ── PickArgs ───────────────────────────────────────────────────────────────────

export type PickArgs = {
	championId: string;
	team: Team;
};

// ── useDraftMutations ──────────────────────────────────────────────────────────

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
				client.current?.setQueryData(draftQueryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Pick failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: draftQueryKey(id) });
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
				client.current?.setQueryData(draftQueryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Ban failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: draftQueryKey(id) });
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
				client.current?.setQueryData(draftQueryKey(session.id), session);
			},
			onError: (err: unknown) => {
				logger.error("Simulate-opponent failed: {error}", { error: String(err) });
			},
			onSettled: () => {
				const id = getDraftId();
				if (id) {
					client.current?.invalidateQueries({ queryKey: draftQueryKey(id) });
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

export function useJoinDraft(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: (draftId: string) => apiJoinDraft(draftId),
			onSuccess: (session: DraftSession) => {
				client.current?.setQueryData(draftQueryKey(session.id), session);
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

export function useEnableSimulation(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const mutation = useMutation(
		{
			mutationFn: (draftId: string) => apiEnableSimulation(draftId),
			onSuccess: session => {
				logger.info("Simulation enabled: id={id}", { id: session.id });
				client.current?.setQueryData(draftQueryKey(session.id), session);
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

// ── Main hooks ─────────────────────────────────────────────────────────────────

/** Main lobby hook — combines listing, creating, and joining drafts. */
export function useDraftLobby(queryClient?: QueryClient) {
	return {
		list: useListDrafts(queryClient),
		create: useCreateDraft(queryClient),
		join: useJoinDraft(queryClient),
	};
}

/** Main draft-session hook — combines session data, mutations, and simulation. */
export function useDraftView(getDraftId: () => string | null, queryClient?: QueryClient) {
	return {
		session: useDraftSession(getDraftId, queryClient),
		mutations: useDraftMutations(getDraftId, queryClient),
		enableSim: useEnableSimulation(queryClient),
	};
}
