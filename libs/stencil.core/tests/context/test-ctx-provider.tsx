import { Component, h } from "@stencil/core";

import { TestContext } from "./test-context";
import type { TestCtxValue } from "./test-context";

import { SsvElement, provideContext } from "#lib";

@Component({ tag: "test-ctx-provider", shadow: true })
export class TestCtxProvider extends SsvElement {
	/** The context value this provider created — exposed for test assertions. */
	readonly ctxValue: TestCtxValue = provideContext(TestContext);

	render() {
		return <slot />;
	}
}
