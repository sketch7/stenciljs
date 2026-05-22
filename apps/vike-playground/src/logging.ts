import { configure, getAnsiColorFormatter, getConsoleSink } from "@logtape/logtape";
import { AsyncLocalStorage } from "node:async_hooks";

/** Bootstrap server-side logging. Call once before any route handlers are registered. */
export async function initServerLogging(): Promise<void> {
	await configure({
		reset: true,
		contextLocalStorage: new AsyncLocalStorage(),
		sinks: {
			console: getConsoleSink({
				formatter: getAnsiColorFormatter({ timestamp: "time-tz" }),
			}),
		},
		loggers: [
			// Suppress LogTape's own startup / meta messages
			{ category: ["logtape", "meta"], sinks: ["console"], lowestLevel: "warning" },
			// Root lol logger — all ["lol", *] categories inherit this sink
			{ category: ["lol"], sinks: ["console"], lowestLevel: "debug" },
		],
	});
}
