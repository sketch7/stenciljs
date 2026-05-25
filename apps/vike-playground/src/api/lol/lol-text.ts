import { Hono } from "hono";

export const lolTextData = {
	"draft.phase.banning": "Banning Phase",
	"draft.phase.picking": "Pick Phase",
	"draft.phase.finished": "Draft Complete",
	"draft.turn.blue": "Blue Team",
	"draft.turn.red": "Red Team",
	"draft.turn.your": "Your Turn",
	"draft.action.pick": "Pick",
	"draft.action.ban": "Ban",
	"draft.slot.pick-empty": "Pick",
	"draft.slot.ban-empty": "Ban",
	"draft.simulate": "Simulate Opponent",
	"draft.simulating": "Simulating…",
	"draft.finished": "Draft Complete",
	"champion-pool.title": "Champion Pool",
	"champion-pool.search": "Search champions…",
	"champion-pool.role.all": "All",
	"champion-pool.role.top": "Top",
	"champion-pool.role.jungle": "Jungle",
	"champion-pool.role.mid": "Mid",
	"champion-pool.role.bot": "Bot",
	"champion-pool.role.support": "Support",
	"champion-pool.difficulty": "Difficulty",
	"champion-pool.loading": "Loading champions…",
	"champion-pool.empty": "No champions match your filters.",
	"champion.status.picked": "Picked",
	"champion.status.banned": "Banned",
	"loading.session": "Starting draft session…",
	"error.create-session": "Failed to create draft session.",
	"error.pick": "Failed to pick champion.",
	"error.ban": "Failed to ban champion.",
} as const;

export type LolTextKey = keyof typeof lolTextData;

export const lolTextApi = new Hono().get("/api/lol/text", c => c.json(lolTextData));
