import { Component, h } from "@stencil/core";

@Component({
	tag: "app-count-widget",
	shadow: false,
})
export class AppCountWidget {
	render() {
		return <app-signals-counter />;
	}
}
