import { defineCompose } from "@ssv/dynamic-widget";

import type { TimerWidgetData } from "./timer/ssv-timer-widget";

defineCompose<TimerWidgetData>("timer", {
	tag: "ssv-timer-widget",
	aliases: ["countdown"],
});

defineCompose("count", { tag: "ssv-count-widget" });
