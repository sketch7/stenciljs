import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

export function useMouseController(host: ReactiveControllerHost): {
	pos: { x: number; y: number };
} {
	let pos = { x: 0, y: 0 };
	const onMouseMove = ({ clientX, clientY }: MouseEvent) => {
		pos = { x: clientX, y: clientY };
		host.requestUpdate();
	};
	const ctrl: ReactiveController = {
		hostConnected() {
			globalThis.addEventListener("mousemove", onMouseMove);
		},
		hostDisconnected() {
			globalThis.removeEventListener("mousemove", onMouseMove);
		},
	};
	host.addController(ctrl);
	return {
		get pos() {
			return pos;
		},
	};
}
