import { Component, h } from "@stencil/core";

import { useTracker } from "./utils";

import { SsvElement } from "#lib";

@Component({ tag: "test-child", shadow: true })
export class TestChild extends SsvElement {
	readonly _tracker = useTracker();

	render() {
		return <span class="child">child</span>;
	}
}
