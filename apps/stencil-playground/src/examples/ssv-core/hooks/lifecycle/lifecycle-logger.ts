import type { HookName } from "@ssv/stencil-core/dev";

export { useLifecycleLogger } from "@ssv/stencil-core/dev";
export type { HookEvent, HookName } from "@ssv/stencil-core/dev";

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
