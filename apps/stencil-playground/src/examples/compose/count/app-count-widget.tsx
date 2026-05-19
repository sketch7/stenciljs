import { Component, h } from "@stencil/core";

@Component({
	tag: "ssv-count-widget",
	shadow: false,
})
export class SsvCountWidget {
	render() {
		return <app-signals-counter />;
	}
}
