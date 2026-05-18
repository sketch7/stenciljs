import { SsvElement, useContext } from "@ssv/stencil.core";
import { Component, Event, EventEmitter, Listen, Prop, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { ComposeRegistryContext } from "../../registry/context";
import type { ComposeEventDetail } from "../../types";

@Component({
	tag: "ssv-compose",
	styleUrl: "ssv-compose.css",
	shadow: false,
})
export class SsvCompose extends SsvElement {
	/** Compose name string — looked up in the registry. */
	@Prop() name!: string;

	/** Data object passed to the resolved widget component. */
	@Prop() data: unknown = undefined;

	/** Normalized output event from any wrapper component in this compose's subtree. */
	@Event() composeEvent!: EventEmitter<ComposeEventDetail>;

	readonly #registry = useContext(ComposeRegistryContext);

	@Listen("ssvComposeOutput")
	onComposeOutput(e: CustomEvent): void {
		e.stopPropagation();
		this.composeEvent.emit({ name: this.name, data: e.detail });
	}

	render(): VNode | null {
		const definition = this.#registry.current.resolve(this.name);
		if (!definition) {
			return <slot name="error" />;
		}
		const props = definition.mapData ? definition.mapData(this.data) : { data: this.data };
		return h(definition.tag, props);
	}
}
