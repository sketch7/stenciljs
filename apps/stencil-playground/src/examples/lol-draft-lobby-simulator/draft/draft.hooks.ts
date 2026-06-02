import { getLogger } from "@logtape/logtape";
import { useMutation, useQuery } from "@ssv/tanstack.stencil-query";

import { useConfig } from "../../../startup-context";
import type { DraftSession, Team } from "../lol.types";
import { useLolDraftQueryClient } from "../shared/lol-query-client";
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

const logger = getLogger(["lol", "draft"]);

export const draftQueryKey = (draftId: string) => ["lol-draft", draftId] as const;

// ── useListDrafts ──────────────────────────────────────────────────────────────

export function useListDrafts() {
	const config = useConfig();
	const listRef = useQuery(() => ({
		queryKey: DRAFTS_QUERY_KEY,
		queryFn: async () => fetchDraftList(config.current?.baseUrl() ?? ""),
		// SSE (useLobbySSE) drives all invalidations — treat cached data as always fresh.
		staleTime: Infinity,
	}));
	return {
		get list() {
			return listRef();
		},
	};
}

// ── useCreateDraft ─────────────────────────────────────────────────────────────

export function useCreateDraft() {
	const client = useLolDraftQueryClient();
	const config = useConfig();
	const mutation = useMutation({
		mutationFn: async () => apiCreateDraft(config.current?.baseUrl() ?? ""),
		onSuccess: (session: DraftSession) => {
			client.current?.setQueryData(draftQueryKey(session.id), session);
		},
	});
	return {
		get create() {
			return mutation();
		},
	};
}

// ── useDraftSession ────────────────────────────────────────────────────────────

export function useDraftSession(getDraftId: () => string | null) {
	const config = useConfig();
	const sessionRef = useQuery(() => {
		const id = getDraftId();
		if (!id) {
			return { queryKey: ["lol-draft", "__none__"] as const, enabled: false, queryFn: () => null };
		}
		// SSE (useDraftSSE) drives all invalidations — treat cached data as always fresh.
		return {
			queryKey: draftQueryKey(id),
			queryFn: async () => fetchDraftSession(config.current?.baseUrl() ?? "", id),
			staleTime: Infinity,
		};
	});

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

export function useDraftMutations(getDraftId: () => string | null) {
	const client = useLolDraftQueryClient();
	const config = useConfig();

	const pickRef = useMutation({
		mutationFn: async ({ championId, team }: PickArgs) => {
			const id = getDraftId();
			if (!id) {
				throw new Error("No active draft session");
			}
			return apiPick(config.current?.baseUrl() ?? "", id, championId, team);
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
	});

	const banRef = useMutation({
		mutationFn: async ({ championId, team }: PickArgs) => {
			const id = getDraftId();
			if (!id) {
				throw new Error("No active draft session");
			}
			return apiBan(config.current?.baseUrl() ?? "", id, championId, team);
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
	});

	const simulateRef = useMutation({
		mutationFn: async () => {
			const id = getDraftId();
			if (!id) {
				throw new Error("No active draft session");
			}
			return apiSimulateOpponent(config.current?.baseUrl() ?? "", id);
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
	});

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

export function useJoinDraft() {
	const client = useLolDraftQueryClient();
	const config = useConfig();
	const mutation = useMutation({
		mutationFn: async (draftId: string) => apiJoinDraft(config.current?.baseUrl() ?? "", draftId),
		onSuccess: (session: DraftSession) => {
			client.current?.setQueryData(draftQueryKey(session.id), session);
		},
	});
	return {
		get join() {
			return mutation();
		},
	};
}

// ── useEnableSimulation ────────────────────────────────────────────────────────

export function useEnableSimulation() {
	const client = useLolDraftQueryClient();
	const config = useConfig();
	const mutation = useMutation({
		mutationFn: async (draftId: string) => apiEnableSimulation(config.current?.baseUrl() ?? "", draftId),
		onSuccess: session => {
			logger.info("Simulation enabled: id={id}", { id: session.id });
			client.current?.setQueryData(draftQueryKey(session.id), session);
		},
		onError: (err: unknown) => {
			logger.error("Enable simulation failed: {error}", { error: String(err) });
		},
	});
	return {
		get enable() {
			return mutation();
		},
	};
}

// ── Main hooks ─────────────────────────────────────────────────────────────────

/** Main lobby hook — combines listing, creating, and joining drafts. */
export function useDraftLobby() {
	return {
		list: useListDrafts(),
		create: useCreateDraft(),
		join: useJoinDraft(),
	};
}

/** Main draft-session hook — combines session data, mutations, and simulation. */
export function useDraftView(getDraftId: () => string | null) {
	return {
		session: useDraftSession(getDraftId),
		mutations: useDraftMutations(getDraftId),
		enableSim: useEnableSimulation(),
	};
}
