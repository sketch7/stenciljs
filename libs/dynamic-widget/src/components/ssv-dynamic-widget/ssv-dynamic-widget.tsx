import { SsvElement, useContext } from "@ssv/stencil.core";
import { Component, Event, EventEmitter, Listen, Prop, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { WidgetRegistryContext } from "../../registry/context";
import type { WidgetEventDetail } from "../../types";

@Component({
	tag: "ssv-dynamic-widget",
	styleUrl: "ssv-dynamic-widget.css",
	shadow: false,
})
export class SsvDynamicWidget extends SsvElement {
	/** Widget name string — looked up in the registry. */
	@Prop() name!: string;

	/** Data object passed to the resolved widget component. */
	@Prop() data: unknown = undefined;

	/** Normalized output event from any wrapper component in this widget's subtree. */
	@Event() widgetEvent!: EventEmitter<WidgetEventDetail>;

	readonly #registry = useContext(WidgetRegistryContext);

	@Listen("ssvWidgetOutput")
	onWidgetOutput(e: CustomEvent): void {
		e.stopPropagation();
		this.widgetEvent.emit({ name: this.name, data: e.detail });
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
