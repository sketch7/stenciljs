import { Hono } from "hono";

import { championsData } from "./champions.data";

export const championsApi = new Hono().get("/api/lol/champions", c => c.json(championsData));
