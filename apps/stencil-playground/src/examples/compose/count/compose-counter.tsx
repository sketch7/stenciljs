import { Component, h } from "@stencil/core";

@Component({
	tag: "app-compose-counter",
	shadow: false,
})
export class AppComposeCounter {
	render() {
		return <app-signals-counter />;
	}
}
