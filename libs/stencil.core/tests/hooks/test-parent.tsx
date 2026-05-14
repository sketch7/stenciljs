import { Component, h } from "@stencil/core";

import { SsvElement } from "../../src/ssv-element";
import { useTracker } from "./utils";

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
