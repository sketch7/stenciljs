import type { CompositionDef, CompositionDefsMap } from "@ssv/stencil-ui/compose";

import type { ComposeTimerData } from "./timer/compose-timer";

export const demoCompositionDefs = {
	timer: { tag: "app-compose-timer", aliases: ["countdown"] },
	count: { tag: "app-compose-counter" },
} satisfies CompositionDefsMap satisfies Record<string, CompositionDef<ComposeTimerData | unknown>>;
