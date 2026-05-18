import { SsvElement } from "@ssv/stencil.core";
import { Component, Event, EventEmitter, Listen, Prop, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { useCompositionRegistry } from "./registry/provide-registry";
import type { ComposeEventDetail } from "./types";

@Component({
	tag: "ssv-compose",
	styleUrl: "compose.css",
	shadow: false,
})
export class SsvCompose extends SsvElement {
	/** Composition name — looked up in the registry. */
	@Prop() name!: string;

	/** Data object passed to the resolved wrapper component. */
	@Prop() data: unknown;

	/** Normalized output event from any wrapper in this composition subtree. */
	@Event() event!: EventEmitter<ComposeEventDetail>;

	readonly #registry = useCompositionRegistry();

	@Listen("ssvComposeOutput")
	onComposeOutput(e: CustomEvent): void {
		e.stopPropagation();
		this.event.emit({ name: this.name, data: e.detail });
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
