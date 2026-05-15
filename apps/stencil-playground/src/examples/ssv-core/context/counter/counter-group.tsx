import { SsvElement, provideContext } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";

import { CounterContext } from "./counter.context";

@Component({
	tag: "app-ctx-counter-group",
	shadow: true,
})
export class AppCtxCounterGroup extends SsvElement {
	readonly store = provideContext(CounterContext);

	render() {
		return <slot />;
	}
}
