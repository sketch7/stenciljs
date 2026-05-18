import { use } from "../../hooks/use";

export type HookName =
	| "hostConnected"
	| "hostDisconnected"
	| "hostWillLoad"
	| "hostDidLoad"
	| "hostWillRender"
	| "hostDidRender"
	| "hostWillUpdate"
	| "hostDidUpdate";

export type HookEvent = {
	hook: HookName;
	ts: string;
	index: number;
};

function timestamp(): string {
	const now = new Date();
	return `${now.toLocaleTimeString("en", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})}.${String(now.getMilliseconds()).padStart(3, "0")}`;
}

const hookColors: Record<HookName, string> = {
	hostConnected: "#4ade80",
	hostDisconnected: "#f87171",
	hostWillLoad: "#67e8f9",
	hostDidLoad: "#60a5fa",
	hostWillRender: "#fde047",
	hostDidRender: "#fb923c",
	hostWillUpdate: "#a78bfa",
	hostDidUpdate: "#f472b6",
};

/**
 * Logs every Stencil lifecycle hook to the console and accumulates events.
 *
 * @example
 * ```ts
 * readonly #lifecycle = useLifecycleLogger();
 *
 * render() {
 *   return <pre>{JSON.stringify(this.#lifecycle.events)}</pre>;
 * }
 * ```
 */
export function useLifecycleLogger() {
	return use(host => {
		const events: HookEvent[] = [];
		let count = 0;

		function fire(hook: HookName): void {
			const ev: HookEvent = { hook, ts: timestamp(), index: ++count };
			// eslint-disable-next-line no-console -- intentional dev logging
			console.warn(
				`%c[lifecycle] %c${hook}`,
				"color: #94a3b8; font-weight: normal",
				`color: ${hookColors[hook]}; font-weight: bold`,
				{ index: ev.index, ts: ev.ts },
			);
			events.push(ev);
		}

		return {
			hooks: {
				hostConnected() {
					fire("hostConnected");
				},
				hostDisconnected() {
					fire("hostDisconnected");
				},
				hostWillLoad() {
					fire("hostWillLoad");
				},
				hostDidLoad() {
					fire("hostDidLoad");
				},
				hostWillRender() {
					fire("hostWillRender");
				},
				hostDidRender() {
					fire("hostDidRender");
				},
				hostWillUpdate() {
					fire("hostWillUpdate");
				},
				hostDidUpdate() {
					fire("hostDidUpdate");
				},
			},
			value: {
				get events(): readonly HookEvent[] {
					return events;
				},
				clear() {
					events.length = 0;
					host.requestUpdate();
				},
			},
		};
	});
}
