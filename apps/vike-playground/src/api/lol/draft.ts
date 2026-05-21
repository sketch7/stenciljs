import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { championsData } from "./champions.data";
import type { DraftSession, DraftTurn, Team } from "./lol.types";

// ── Turn order: full competitive LoL draft (10 bans + 10 picks) ────────────────
const TURN_ORDER: DraftTurn[] = [
	// Phase 1 bans — blue/red alternating (3 each)
	{ team: "blue", action: "ban", slot: 0 },
	{ team: "red", action: "ban", slot: 0 },
	{ team: "blue", action: "ban", slot: 1 },
	{ team: "red", action: "ban", slot: 1 },
	{ team: "blue", action: "ban", slot: 2 },
	{ team: "red", action: "ban", slot: 2 },
	// Phase 1 picks — B → RR → BB → R
	{ team: "blue", action: "pick", slot: 0 },
	{ team: "red", action: "pick", slot: 0 },
	{ team: "red", action: "pick", slot: 1 },
	{ team: "blue", action: "pick", slot: 1 },
	{ team: "blue", action: "pick", slot: 2 },
	{ team: "red", action: "pick", slot: 2 },
	// Phase 2 bans — red starts (2 each)
	{ team: "red", action: "ban", slot: 3 },
	{ team: "blue", action: "ban", slot: 3 },
	{ team: "red", action: "ban", slot: 4 },
	{ team: "blue", action: "ban", slot: 4 },
	// Phase 2 picks — R → BB → RR → B
	{ team: "red", action: "pick", slot: 3 },
	{ team: "blue", action: "pick", slot: 3 },
	{ team: "blue", action: "pick", slot: 4 },
	{ team: "red", action: "pick", slot: 4 },
];

// ── In-memory store ────────────────────────────────────────────────────────────
const sessions = new Map<string, DraftSession>();

type SseSendFn = (data: string) => Promise<void>;
const sseClients = new Map<string, Set<SseSendFn>>();

function broadcastSession(sessionId: string): void {
	const session = sessions.get(sessionId);
	if (!session) {
		return;
	}
	const clients = sseClients.get(sessionId);
	if (!clients || clients.size === 0) {
		return;
	}
	const payload = JSON.stringify(session);
	for (const send of clients) {
		send(payload).catch(() => {
			/* client disconnected */
		});
	}
}

function addSseClient(sessionId: string, send: SseSendFn): void {
	if (!sseClients.has(sessionId)) {
		sseClients.set(sessionId, new Set());
	}
	sseClients.get(sessionId)!.add(send);
}

function removeSseClient(sessionId: string, send: SseSendFn): void {
	sseClients.get(sessionId)?.delete(send);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function derivePhase(session: DraftSession): DraftSession["phase"] {
	if (session.currentTurnIndex >= TURN_ORDER.length) {
		return "finished";
	}
	const turn = TURN_ORDER[session.currentTurnIndex];
	return turn.action === "ban" ? "banning" : "picking";
}

function getPickedAndBannedIds(session: DraftSession): Set<string> {
	const ids = new Set<string>();
	for (const id of [...session.bluePicks, ...session.redPicks, ...session.blueBans, ...session.redBans]) {
		if (id) {
			ids.add(id);
		}
	}
	return ids;
}

function getAvailableChampions(session: DraftSession): string[] {
	const excluded = getPickedAndBannedIds(session);
	return championsData.map(c => c.id).filter(id => !excluded.has(id));
}

// ── Route handlers ─────────────────────────────────────────────────────────────
export const draftApi = new Hono()
	// Create a new draft session
	.post("/api/lol/drafts", c => {
		const id = crypto.randomUUID();
		const session: DraftSession = {
			id,
			phase: "banning",
			currentTurnIndex: 0,
			turnOrder: TURN_ORDER,
			bluePicks: [null, null, null, null, null],
			blueBans: [null, null, null, null, null],
			redPicks: [null, null, null, null, null],
			redBans: [null, null, null, null, null],
			createdAt: new Date().toISOString(),
		};
		sessions.set(id, session);
		return c.json(session, 201);
	})

	// Get a draft session
	.get("/api/lol/drafts/:id", c => {
		const session = sessions.get(c.req.param("id"));
		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}
		return c.json(session);
	})

	// Pick a champion
	.post("/api/lol/drafts/:id/pick", async c => {
		const session = sessions.get(c.req.param("id"));
		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		if (currentTurn.action !== "pick") {
			return c.json({ error: `Not a pick turn — expected ${currentTurn.action}` }, 400);
		}

		const body = await c.req.json<{ championId: string; team: Team }>();
		const { championId, team } = body;

		if (currentTurn.team !== team) {
			return c.json({ error: `Not ${team}'s pick turn` }, 400);
		}

		const excluded = getPickedAndBannedIds(session);
		if (excluded.has(championId)) {
			return c.json({ error: "Champion already picked or banned" }, 409);
		}

		const picks = team === "blue" ? session.bluePicks : session.redPicks;
		picks[currentTurn.slot] = championId;

		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);

		broadcastSession(session.id);
		return c.json(session);
	})

	// Ban a champion
	.post("/api/lol/drafts/:id/ban", async c => {
		const session = sessions.get(c.req.param("id"));
		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		if (currentTurn.action !== "ban") {
			return c.json({ error: `Not a ban turn — expected ${currentTurn.action}` }, 400);
		}

		const body = await c.req.json<{ championId: string; team: Team }>();
		const { championId, team } = body;

		if (currentTurn.team !== team) {
			return c.json({ error: `Not ${team}'s ban turn` }, 400);
		}

		const excluded = getPickedAndBannedIds(session);
		if (excluded.has(championId)) {
			return c.json({ error: "Champion already picked or banned" }, 409);
		}

		const bans = team === "blue" ? session.blueBans : session.redBans;
		bans[currentTurn.slot] = championId;

		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);

		broadcastSession(session.id);
		return c.json(session);
	})

	// Simulate the opponent's next action with a random available champion
	.post("/api/lol/drafts/:id/simulate-opponent", c => {
		const session = sessions.get(c.req.param("id"));
		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		const available = getAvailableChampions(session);
		if (available.length === 0) {
			return c.json({ error: "No available champions" }, 400);
		}

		const championId = available[Math.floor(Math.random() * available.length)]!;

		if (currentTurn.action === "ban") {
			const bans = currentTurn.team === "blue" ? session.blueBans : session.redBans;
			bans[currentTurn.slot] = championId;
		} else {
			const picks = currentTurn.team === "blue" ? session.bluePicks : session.redPicks;
			picks[currentTurn.slot] = championId;
		}

		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);

		broadcastSession(session.id);
		return c.json(session);
	})

	// SSE stream for real-time draft updates
	.get("/api/lol/drafts/:id/events", c => {
		const sessionId = c.req.param("id");

		if (!sessions.has(sessionId)) {
			return c.json({ error: "Session not found" }, 404);
		}

		return streamSSE(c, async stream => {
			const send: SseSendFn = async data => {
				await stream.writeSSE({ data, event: "draft-updated" });
			};

			addSseClient(sessionId, send);

			// Send current state immediately on connect
			const session = sessions.get(sessionId);
			if (session) {
				await stream.writeSSE({ data: JSON.stringify(session), event: "connected" });
			}

			// Keep alive until client disconnects
			await new Promise<void>(resolve => {
				c.req.signal.addEventListener("abort", resolve, { once: true });
			});

			removeSseClient(sessionId, send);
		});
	});
