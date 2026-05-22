import { addVikeMiddleware } from "@vikejs/hono";
import { Hono } from "hono";
import type { Server } from "vike/types";

import { lolApi } from "../api/lol";
import { translationsApi } from "../api/translations";

const app = new Hono();

app.route("/", translationsApi);
app.route("/", lolApi);
addVikeMiddleware(app);

const port = Number.parseInt(process.env["PORT"] ?? "3100", 10);

export default {
	fetch: app.fetch,
	prod: {
		port,
	},
} satisfies Server;
