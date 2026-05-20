import { createCompositionDefs } from "@ssv/stencil-ui/compose";
import type { CompositionNameOf } from "@ssv/stencil-ui/compose";

export const demoCompositionDefs = createCompositionDefs({
	timer: { tag: "app-timer", aliases: ["countdown"] },
	count: { tag: "app-signals-counter" },
});

export type DemoCompositionName = CompositionNameOf<typeof demoCompositionDefs>;
