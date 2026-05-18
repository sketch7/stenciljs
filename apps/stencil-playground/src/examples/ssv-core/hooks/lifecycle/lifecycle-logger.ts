import { use } from "@ssv/stencil.core";

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
}

export const hookMeta: Record<HookName, { badge: string; desc: string }> = {
	hostConnected: { badge: "connected", desc: "Element connected to the DOM" },
	hostDisconnected: { badge: "disconnected", desc: "Element removed from the DOM" },
	hostWillLoad: { badge: "will-load", desc: "Before the first render" },
	hostDidLoad: { badge: "did-load", desc: "After the first render" },
	hostWillRender: { badge: "will-render", desc: "Before every render" },
	hostDidRender: { badge: "did-render", desc: "After every render" },
	hostWillUpdate: { badge: "will-update", desc: "Before a re-render (never first)" },
	hostDidUpdate: { badge: "did-update", desc: "After a re-render (never first)" },
};

function timestamp(): string {
	const now = new Date();
	return (
		`${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
		}.${ 
		String(now.getMilliseconds()).padStart(3, "0")}`
	);
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

export function useLifecycleLogger() {
	return use(host => {
		const events: HookEvent[] = [];
		let count = 0;

		function fire(hook: HookName): void {
			const ev: HookEvent = { hook, ts: timestamp(), index: ++count };
			// eslint-disable-next-line no-console -- intentional warn for demo
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
