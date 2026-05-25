import { Hono } from "hono";

import { championsApi } from "./champions";
import { draftApi } from "./draft";
import { lolTextApi } from "./lol-text";

const lolApi = new Hono();

lolApi.route("/", championsApi);
lolApi.route("/", draftApi);
lolApi.route("/", lolTextApi);

export { lolApi };
