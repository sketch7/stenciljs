import { Component, h } from "@stencil/core";

import { SsvElement } from "../../src/ssv-element";
import { useTracker } from "./utils";

@Component({ tag: "test-counter", shadow: true })
export class TestCounter extends SsvElement {
	readonly _a = useTracker();
	readonly _b = useTracker();

	render() {
		return <span>counter</span>;
	}
}
