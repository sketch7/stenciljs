import { useMutation, useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import { BASE_URL } from "../shared/lol.constants";
import type { DraftSession, Team } from "../shared/lol.types";

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
		return { queryKey: queryKey(id), queryFn: () => fetchDraftSession(id), staleTime: 0 };
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
				client.current?.setQueryData(queryKey(session.id), session);
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
				client.current?.setQueryData(queryKey(session.id), session);
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
				client.current?.setQueryData(queryKey(session.id), session);
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
