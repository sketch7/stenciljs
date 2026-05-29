import { getLogger } from "@logtape/logtape";

import type { DraftSession, Team } from "../lol.types";

const logger = getLogger(["lol", "draft"]);

export async function fetchDraftSession(baseUrl: string, draftId: string): Promise<DraftSession> {
	const url = `${baseUrl}/api/lol/drafts/${draftId}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch draft session: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export async function apiCreateDraft(baseUrl: string): Promise<DraftSession> {
	const res = await fetch(`${baseUrl}/api/lol/drafts`, { method: "POST" });
	if (!res.ok) {
		throw new Error(`Failed to create draft session: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export async function apiPick(baseUrl: string, draftId: string, championId: string, team: Team): Promise<DraftSession> {
	logger.debug("Sending pick: {championId} ({team})", { draftId, championId, team });
	const res = await fetch(`${baseUrl}/api/lol/drafts/${draftId}/pick`, {
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

export async function apiBan(baseUrl: string, draftId: string, championId: string, team: Team): Promise<DraftSession> {
	logger.debug("Sending ban: {championId} ({team})", { draftId, championId, team });
	const res = await fetch(`${baseUrl}/api/lol/drafts/${draftId}/ban`, {
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

export async function apiSimulateOpponent(baseUrl: string, draftId: string): Promise<DraftSession> {
	const res = await fetch(`${baseUrl}/api/lol/drafts/${draftId}/simulate-opponent`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Simulate failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export async function apiJoinDraft(baseUrl: string, draftId: string): Promise<DraftSession> {
	const res = await fetch(`${baseUrl}/api/lol/drafts/${draftId}/join`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Join failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

export async function apiEnableSimulation(baseUrl: string, draftId: string): Promise<DraftSession> {
	const res = await fetch(`${baseUrl}/api/lol/drafts/${draftId}/simulation/enable`, { method: "POST" });
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error ?? `Enable simulation failed: ${res.status}`);
	}
	return res.json() as Promise<DraftSession>;
}

// ── Draft list ─────────────────────────────────────────────────────────────────

export const DRAFTS_QUERY_KEY = ["lol-drafts"] as const;

export async function fetchDraftList(baseUrl: string): Promise<DraftSession[]> {
	logger.info("Fetching draft list...");
	const res = await fetch(`${baseUrl}/api/lol/drafts`);
	if (!res.ok) {
		throw new Error(`Failed to fetch draft list: ${res.status}`);
	}
	return res.json() as Promise<DraftSession[]>;
}
