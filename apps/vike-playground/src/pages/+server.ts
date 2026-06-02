import { honoLogger } from "@logtape/hono";
import { addVikeMiddleware } from "@vikejs/hono";
import { Hono } from "hono";
import type { Server } from "vike/types";

import { lolApi } from "../api/lol";
import { translationsApi } from "../api/translations";
import { initServerLogging } from "../logging";

await initServerLogging();

const app = new Hono();

// HTTP request/response logging — skips long-lived SSE streams
app.use(
	honoLogger({
		category: ["lol", "http"],
		format: "dev",
		level: "info",
		skip: c => c.req.path.includes("/events"),
	}),
);

app.route("/", translationsApi);
app.route("/", lolApi);
addVikeMiddleware(app);

const port = Number.parseInt(process.env.PORT ?? "3100", 10);

export default {
	fetch: app.fetch,
	prod: {
		port,
	},
} satisfies Server;
