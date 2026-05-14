import { Component, h } from "@stencil/core";

import { SsvElement } from "../../src/ssv-element";
import { useTracker } from "./utils";

@Component({ tag: "test-child", shadow: true })
export class TestChild extends SsvElement {
	readonly _tracker = useTracker();

	render() {
		return <span class="child">child</span>;
	}
}
