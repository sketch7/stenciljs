import { use } from "@ssv/stencil-core";

export function useMouseController() {
	return use(host => {
		let pos = { x: 0, y: 0 };
		const onMouseMove = ({ clientX, clientY }: MouseEvent) => {
			pos = { x: clientX, y: clientY };
			host.requestUpdate();
		};
		return {
			hooks: {
				hostConnected() {
					globalThis.addEventListener("mousemove", onMouseMove);
				},
				hostDisconnected() {
					globalThis.removeEventListener("mousemove", onMouseMove);
				},
			},
			value: {
				get pos() {
					return pos;
				},
			},
		};
	});
}
