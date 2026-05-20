import { createCompositionDefs } from "@ssv/stencil-ui/compose";
import type { CompositionNameOf } from "@ssv/stencil-ui/compose";

export type TimerWidgetData = {
	duration: number;
	isRunning?: boolean;
};

export type TimerWidgetOutput = {
	isRunning: boolean;
};

function toTimerWidgetData(data: unknown): TimerWidgetData {
	if (typeof data !== "object" || data === null) {
		return { duration: 0, isRunning: false };
	}
	const value = data as Partial<TimerWidgetData>;
	return {
		duration: typeof value.duration === "number" ? value.duration : 0,
		isRunning: typeof value.isRunning === "boolean" ? value.isRunning : false,
	};
}

export const demoCompositionDefs = createCompositionDefs({
	timer: {
		tag: "app-timer",
		aliases: ["countdown"],
		mapData: data => {
			const timerData = toTimerWidgetData(data);
			return {
				duration: timerData.duration,
				isRunning: timerData.isRunning ?? false,
			};
		},
		mapOutputs: {
			isRunningChange: (event: CustomEvent<boolean>): TimerWidgetOutput => ({ isRunning: Boolean(event.detail) }),
		},
	},
	count: { tag: "app-signals-counter" },
});

export type DemoCompositionName = CompositionNameOf<typeof demoCompositionDefs>;
