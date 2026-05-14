import { Component, h } from "@stencil/core";

import type { ReactiveController } from "../../src/hooks/reactive-controller";
import { use } from "../../src/hooks/use";
import { SsvElement } from "../../src/ssv-element";

function useTracker(): ReactiveController {
	const ctrl: ReactiveController = {};
	use(ctrl);
	return ctrl;
}

@Component({ tag: "test-counter", shadow: true })
export class TestCounter extends SsvElement {
	readonly _a = useTracker();
	readonly _b = useTracker();

	render() {
		return <span>counter</span>;
	}
}
