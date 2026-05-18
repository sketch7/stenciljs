import { defineCompose } from "@ssv/stencil-ui/compose";

import type { TimerWidgetData } from "./timer/ssv-timer-widget";

defineCompose<TimerWidgetData>("timer", {
	tag: "ssv-timer-widget",
	aliases: ["countdown"],
});

defineCompose("count", { tag: "ssv-count-widget" });
