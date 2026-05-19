import { Component, h } from "@stencil/core";

import { TestContext } from "./test-context";
import type { TestCtxValue } from "./test-context";

import { SsvElement, useContext } from "#lib";
import type { ContextRef } from "#lib";

@Component({ tag: "test-ctx-consumer", shadow: true })
export class TestCtxConsumer extends SsvElement {
	/** The resolved context reference — exposed for test assertions. */
	readonly ctxRef: ContextRef<TestCtxValue> = useContext(TestContext);

	render() {
		return <span class="ctx-id">{this.ctxRef.current.id}</span>;
	}
}
