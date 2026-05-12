import type { ReactiveController, ReactiveControllerHost } from "@ssv/stenciljs.core";

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
		window.addEventListener("mousemove", this.onMouseMove);
	}

	hostDisconnected() {
		window.removeEventListener("mousemove", this.onMouseMove);
	}
}

export function withMouseController(host: ReactiveControllerHost): MouseController {
	return new MouseController(host);
}
