import { Component, h } from "@stencil/core";

import type { ReactiveController } from "../../src/hooks/reactive-controller";
import { use } from "../../src/hooks/use";
import { SsvElement } from "../../src/ssv-element";

function useTracker(): ReactiveController {
	const ctrl: ReactiveController = {};
	use(ctrl);
	return ctrl;
}

@Component({ tag: "test-child", shadow: true })
export class TestChild extends SsvElement {
	// eslint-disable-next-line no-unused-private-class-members
	readonly #tracker = useTracker();

	render() {
		return <span class="child">child</span>;
	}
}
