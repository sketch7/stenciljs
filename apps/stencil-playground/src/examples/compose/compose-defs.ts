import { createCompositionDefs, registerCompositionDefs } from "@ssv/stencil-ui/compose";
import type { CompositionNameOf } from "@ssv/stencil-ui/compose";

export const demoCompositionDefs = createCompositionDefs({
	timer: { tag: "app-timer-widget", aliases: ["countdown"] },
	count: { tag: "app-count-widget" },
});

export type DemoCompositionName = CompositionNameOf<typeof demoCompositionDefs>;

registerCompositionDefs(demoCompositionDefs);
