import type { ReactiveController, ReactiveControllerHost } from "@ssv/stencil.core";

class MouseController implements ReactiveController {
	private host: ReactiveControllerHost;
	pos = { x: 0, y: 0 };

	readonly onMouseMove = ({ clientX, clientY }: MouseEvent) => {
		this.pos = { x: clientX, y: clientY };
		this.host.requestUpdate();
	};

	constructor(host: ReactiveControllerHost) {
		this.host = host;
		host.addController(this);
	}

	hostConnected() {
		globalThis.addEventListener("mousemove", this.onMouseMove);
	}

	hostDisconnected() {
		globalThis.removeEventListener("mousemove", this.onMouseMove);
	}
}

export function withMouseController(host: ReactiveControllerHost): MouseController {
	return new MouseController(host);
}
