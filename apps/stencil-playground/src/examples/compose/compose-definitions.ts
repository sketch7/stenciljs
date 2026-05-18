import { createCompositionRegistry } from "@ssv/stencil-ui/compose";

import type { ComposeTimerData } from "./timer/compose-timer";

export const demoCompositionRegistry = createCompositionRegistry()
	.register<ComposeTimerData>("timer", { tag: "app-compose-timer", aliases: ["countdown"] })
	.register("count", { tag: "app-compose-counter" });
