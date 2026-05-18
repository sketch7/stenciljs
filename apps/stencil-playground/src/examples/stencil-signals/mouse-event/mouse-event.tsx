import { useSignalWatcher } from "@ssv/stencil-signals";
import { signalFromEvent } from "@ssv/stencil-signals/extensions";
import { SsvElement } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";

type MousePos = { x: number; y: number };

@Component({
	tag: "app-signals-mouse-event",
	styleUrl: "mouse-event.css",
	shadow: true,
})
export class AppSignalsMouseEvent extends SsvElement {
	readonly signalWatcher = useSignalWatcher();

	/** Same window mousemove as AppMouseHost, via @Listen-equivalent `signalFromEvent`. */
	readonly $pos = signalFromEvent<MouseEvent, MousePos>("mousemove", {
		target: "window",
		map: ({ clientX, clientY }) => ({ x: clientX, y: clientY }),
		initialValue: { x: 0, y: 0 },
	});

	render() {
		const pos = this.$pos();

		return (
			<div class="mouse-event">
				<div class="pos-display">
					<div class="pos-item">
						<span class="pos-label">X</span>
						<span class="pos-value">{pos.x}</span>
					</div>
					<div class="pos-item">
						<span class="pos-label">Y</span>
						<span class="pos-value">{pos.y}</span>
					</div>
				</div>
				<p class="hint">Move your mouse — position comes from signalFromEvent on window mousemove.</p>
			</div>
		);
	}
}
