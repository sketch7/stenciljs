import { SsvElement, useContext, type ContextRef } from "#lib";
import { Component, h } from "@stencil/core";

import { TestContext, type TestCtxValue } from "./test-context";

@Component({ tag: "test-ctx-consumer", shadow: true })
export class TestCtxConsumer extends SsvElement {
	/** The resolved context reference — exposed for test assertions. */
	readonly ctxRef: ContextRef<TestCtxValue> = useContext(TestContext);

	render() {
		return <span class="ctx-id">{this.ctxRef.current.id}</span>;
	}
}
