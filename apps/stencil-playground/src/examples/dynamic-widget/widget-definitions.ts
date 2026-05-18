import { defineWidget } from "@ssv/dynamic-widget";

import type { TimerWidgetData } from "./timer/ssv-timer-widget";

defineWidget<TimerWidgetData>("timer", {
	tag: "ssv-timer-widget",
	aliases: ["countdown"],
});

defineWidget("count", { tag: "ssv-count-widget" });
