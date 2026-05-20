import { createCompositionDefs } from "@ssv/stencil-ui/compose";
import type { CompositionNameOf } from "@ssv/stencil-ui/compose";

export type TimerWidgetData = {
	duration: number;
	isRunning?: boolean;
};

export type TimerWidgetOutput = {
	isRunning: boolean;
};

export const demoCompositionDefs = createCompositionDefs({
	timer: {
		tag: "app-timer",
		aliases: ["countdown"],
		mapData: data => {
			const timerData = data as TimerWidgetData;
			return {
				duration: timerData.duration,
				isRunning: timerData.isRunning ?? false,
			};
		},
		mapOutputs: {
			isRunningChange: (event: CustomEvent<boolean>): TimerWidgetOutput => ({ isRunning: event.detail }),
		},
	},
	count: { tag: "app-signals-counter" },
});

export type DemoCompositionName = CompositionNameOf<typeof demoCompositionDefs>;
