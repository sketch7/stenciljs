import { SsvElement, provideContext } from "#lib";
import { Component, h } from "@stencil/core";

import { TestContext, type TestCtxValue } from "./test-context";

@Component({ tag: "test-ctx-provider", shadow: true })
export class TestCtxProvider extends SsvElement {
	/** The context value this provider created — exposed for test assertions. */
	readonly ctxValue: TestCtxValue = provideContext(TestContext);

	render() {
		return <slot />;
	}
}
