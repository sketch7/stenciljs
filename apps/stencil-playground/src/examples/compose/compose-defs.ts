import { createCompositionDefs, registerCompositionDefs } from "@ssv/stencil-ui/compose";
import type { CompositionNameOf } from "@ssv/stencil-ui/compose";

export const demoCompositionDefs = createCompositionDefs({
	timer: { tag: "ssv-timer-widget", aliases: ["countdown"] },
	count: { tag: "ssv-count-widget" },
});

export type DemoCompositionName = CompositionNameOf<typeof demoCompositionDefs>;

registerCompositionDefs(demoCompositionDefs);
