import { getLogger } from "@logtape/logtape";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { championsData } from "./champions.data";
import type { DraftSession, DraftTurn, Team } from "./lol.types";

const logger = getLogger(["lol", "draft"]);

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
let roomCounter = 0;

type SseSendFn = (data: string) => Promise<void>;
const sseClients = new Map<string, Set<SseSendFn>>();
const lobbyClients = new Set<SseSendFn>();

function broadcastLobby(): void {
	const open = [...sessions.values()].filter(s => s.phase !== "finished");
	const payload = JSON.stringify(open);
	for (const send of lobbyClients) {
		send(payload).catch(() => {
			/* client disconnected */
		});
	}
}

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
	if (session.playerCount < 2 && !session.simulationMode) {
		return "waiting";
	}
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

function autoSimulate(session: DraftSession): void {
	while (session.phase !== "finished" && session.phase !== "waiting") {
		const turn = TURN_ORDER[session.currentTurnIndex];
		if (turn?.team !== "red") {
			break;
		}
		const available = getAvailableChampions(session);
		if (available.length === 0) {
			break;
		}
		const championId = available[Math.floor(Math.random() * available.length)];
		const turnIdx = session.currentTurnIndex;
		if (turn.action === "ban") {
			session.redBans[turn.slot] = championId;
		} else {
			session.redPicks[turn.slot] = championId;
		}
		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);
		logger.debug("Auto-sim {id}: {team} {action} {championId} (slot {slot}, turn {turn}) \u2192 {phase}", {
			id: session.id,
			team: turn.team,
			action: turn.action,
			championId,
			slot: turn.slot,
			turn: turnIdx,
			phase: session.phase,
		});
	}
}

// ── Route handlers ─────────────────────────────────────────────────────────────
export const draftApi = new Hono()
	// Create a new draft session
	.post("/api/lol/drafts", c => {
		const id = crypto.randomUUID();
		const session: DraftSession = {
			id,
			name: `Room #${++roomCounter}`,
			phase: "waiting",
			playerCount: 1,
			simulationMode: false,
			currentTurnIndex: 0,
			turnOrder: TURN_ORDER,
			bluePicks: [null, null, null, null, null],
			blueBans: [null, null, null, null, null],
			redPicks: [null, null, null, null, null],
			redBans: [null, null, null, null, null],
			createdAt: new Date().toISOString(),
		};
		sessions.set(id, session);
		logger.info("Session created: {id} ({name})", { id, name: session.name });
		broadcastLobby();
		return c.json(session, 201);
	})

	// List all open draft sessions
	.get("/api/lol/drafts", c => {
		const open = [...sessions.values()].filter(s => s.phase !== "finished");
		return c.json(open);
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
		const id = c.req.param("id");
		const session = sessions.get(id);
		if (!session) {
			logger.warn("Pick rejected: session not found {id}", { id });
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.phase === "waiting") {
			logger.warn("Pick rejected: draft not started {id}", { id });
			return c.json({ error: "Draft has not started yet" }, 400);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			logger.warn("Pick rejected: draft finished {id}", { id });
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		if (currentTurn.action !== "pick") {
			logger.warn("Pick rejected: wrong action {id} (expected pick, got {action})", { id, action: currentTurn.action });
			return c.json({ error: `Not a pick turn \u2014 expected ${currentTurn.action}` }, 400);
		}

		const body = await c.req.json<{ championId: string; team: Team }>();
		const { championId, team } = body;

		if (currentTurn.team !== team) {
			logger.warn("Pick rejected: wrong team {id} (expected {expected}, got {team})", {
				id,
				expected: currentTurn.team,
				team,
			});
			return c.json({ error: `Not ${team}'s pick turn` }, 400);
		}

		const excluded = getPickedAndBannedIds(session);
		if (excluded.has(championId)) {
			logger.warn("Pick rejected: champion unavailable {id} championId={championId}", { id, championId });
			return c.json({ error: "Champion already picked or banned" }, 409);
		}

		const picks = team === "blue" ? session.bluePicks : session.redPicks;
		picks[currentTurn.slot] = championId;
		const turnIdx = session.currentTurnIndex;
		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);
		logger.info("Pick {id}: {team} picked {championId} (slot {slot}, turn {turn}) \u2192 {phase}", {
			id,
			team,
			championId,
			slot: currentTurn.slot,
			turn: turnIdx,
			phase: session.phase,
		});

		if (session.simulationMode) {
			autoSimulate(session);
		}
		broadcastSession(session.id);
		if (session.phase === "finished") {
			broadcastLobby();
		}
		return c.json(session);
	})

	// Ban a champion
	.post("/api/lol/drafts/:id/ban", async c => {
		const id = c.req.param("id");
		const session = sessions.get(id);
		if (!session) {
			logger.warn("Ban rejected: session not found {id}", { id });
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.phase === "waiting") {
			logger.warn("Ban rejected: draft not started {id}", { id });
			return c.json({ error: "Draft has not started yet" }, 400);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			logger.warn("Ban rejected: draft finished {id}", { id });
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		if (currentTurn.action !== "ban") {
			logger.warn("Ban rejected: wrong action {id} (expected ban, got {action})", { id, action: currentTurn.action });
			return c.json({ error: `Not a ban turn \u2014 expected ${currentTurn.action}` }, 400);
		}

		const body = await c.req.json<{ championId: string; team: Team }>();
		const { championId, team } = body;

		if (currentTurn.team !== team) {
			logger.warn("Ban rejected: wrong team {id} (expected {expected}, got {team})", {
				id,
				expected: currentTurn.team,
				team,
			});
			return c.json({ error: `Not ${team}'s ban turn` }, 400);
		}

		const excluded = getPickedAndBannedIds(session);
		if (excluded.has(championId)) {
			logger.warn("Ban rejected: champion unavailable {id} championId={championId}", { id, championId });
			return c.json({ error: "Champion already picked or banned" }, 409);
		}

		const bans = team === "blue" ? session.blueBans : session.redBans;
		bans[currentTurn.slot] = championId;
		const turnIdx = session.currentTurnIndex;
		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);
		logger.info("Ban {id}: {team} banned {championId} (slot {slot}, turn {turn}) \u2192 {phase}", {
			id,
			team,
			championId,
			slot: currentTurn.slot,
			turn: turnIdx,
			phase: session.phase,
		});

		if (session.simulationMode) {
			autoSimulate(session);
		}
		broadcastSession(session.id);
		if (session.phase === "finished") {
			broadcastLobby();
		}
		return c.json(session);
	})

	// Simulate the opponent's next action with a random available champion
	.post("/api/lol/drafts/:id/simulate-opponent", c => {
		const id = c.req.param("id");
		const session = sessions.get(id);
		if (!session) {
			logger.warn("Simulate rejected: session not found {id}", { id });
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.phase === "waiting") {
			logger.warn("Simulate rejected: draft not started {id}", { id });
			return c.json({ error: "Draft has not started yet" }, 400);
		}

		if (session.currentTurnIndex >= TURN_ORDER.length) {
			logger.warn("Simulate rejected: draft finished {id}", { id });
			return c.json({ error: "Draft is finished" }, 400);
		}

		const currentTurn = TURN_ORDER[session.currentTurnIndex];
		const available = getAvailableChampions(session);
		if (available.length === 0) {
			logger.warn("Simulate rejected: no champions available {id}", { id });
			return c.json({ error: "No available champions" }, 400);
		}

		const championId = available[Math.floor(Math.random() * available.length)];
		const turnIdx = session.currentTurnIndex;

		if (currentTurn.action === "ban") {
			const bans = currentTurn.team === "blue" ? session.blueBans : session.redBans;
			bans[currentTurn.slot] = championId;
		} else {
			const picks = currentTurn.team === "blue" ? session.bluePicks : session.redPicks;
			picks[currentTurn.slot] = championId;
		}

		session.currentTurnIndex += 1;
		session.phase = derivePhase(session);
		logger.info("Simulate {id}: {team} {action} {championId} (slot {slot}, turn {turn}) \u2192 {phase}", {
			id,
			team: currentTurn.team,
			action: currentTurn.action,
			championId,
			slot: currentTurn.slot,
			turn: turnIdx,
			phase: session.phase,
		});

		broadcastSession(session.id);
		if (session.phase === "finished") {
			broadcastLobby();
		}
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
			const clientCount = sseClients.get(sessionId)?.size ?? 0;
			logger.debug("SSE connected: sessionId={sessionId} clients={clientCount}", { sessionId, clientCount });

			// Send current state immediately on connect
			const session = sessions.get(sessionId);
			if (session) {
				await stream.writeSSE({ data: JSON.stringify(session), event: "connected" });
			}

			// Keep alive until client disconnects
			await new Promise<void>(resolve => {
				stream.onAbort(resolve);
			});

			removeSseClient(sessionId, send);
			const remainingCount = sseClients.get(sessionId)?.size ?? 0;
			logger.debug("SSE disconnected: sessionId={sessionId} clients={remainingCount}", { sessionId, remainingCount });
		});
	})

	// Join an existing draft session as the red-side player
	.post("/api/lol/drafts/:id/join", c => {
		const id = c.req.param("id");
		const session = sessions.get(id);
		if (!session) {
			logger.warn("Join rejected: session not found {id}", { id });
			return c.json({ error: "Session not found" }, 404);
		}
		if (session.playerCount >= 2) {
			logger.warn("Join rejected: session full {id}", { id });
			return c.json({ error: "Session is full" }, 409);
		}
		session.playerCount = 2;
		session.simulationMode = false;
		session.phase = derivePhase(session);
		logger.info("Player joined: {id} \u2192 {phase}", { id, phase: session.phase });
		broadcastSession(session.id);
		broadcastLobby();
		return c.json(session);
	})

	// Enable simulation mode — auto-plays all red-side turns
	.post("/api/lol/drafts/:id/simulation/enable", c => {
		const id = c.req.param("id");
		const session = sessions.get(id);
		if (!session) {
			logger.warn("Enable simulation rejected: session not found {id}", { id });
			return c.json({ error: "Session not found" }, 404);
		}
		if (session.playerCount >= 2) {
			logger.warn("Enable simulation rejected: second player present {id}", { id });
			return c.json({ error: "Cannot enable simulation with a second player present" }, 409);
		}
		session.simulationMode = true;
		session.phase = derivePhase(session);
		logger.info("Simulation enabled: {id}", { id });
		autoSimulate(session);
		broadcastSession(session.id);
		broadcastLobby();
		return c.json(session);
	})

	// SSE stream for lobby list updates
	.get("/api/lol/lobby/events", c =>
		streamSSE(c, async stream => {
			const send: SseSendFn = async data => {
				await stream.writeSSE({ data, event: "lobby-updated" });
			};
			lobbyClients.add(send);

			const open = [...sessions.values()].filter(s => s.phase !== "finished");
			await stream.writeSSE({ data: JSON.stringify(open), event: "connected" });

			await new Promise<void>(resolve => {
				stream.onAbort(resolve);
			});

			lobbyClients.delete(send);
		}),
	);
