import { Component, h } from "@stencil/core";

import type { ReactiveController } from "../../src/hooks/reactive-controller";
import { use } from "../../src/hooks/use";
import { SsvElement } from "../../src/ssv-element";

function useTracker(): ReactiveController {
	const ctrl: ReactiveController = {};
	use(ctrl);
	return ctrl;
}

@Component({ tag: "test-parent", shadow: true })
export class TestParent extends SsvElement {
	readonly _tracker = useTracker();

	render() {
		return (
			<div class="parent">
				<test-child />
			</div>
		);
	}
}
