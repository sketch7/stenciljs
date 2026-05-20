import { addVikeMiddleware } from "@vikejs/hono";
import { Hono } from "hono";
import type { Server } from "vike/types";

import { translationsApi } from "../api/translations";

const app = new Hono();

app.route("/", translationsApi);
addVikeMiddleware(app);

const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);

export default {
	fetch: app.fetch,
	prod: {
		port,
	},
} satisfies Server;
