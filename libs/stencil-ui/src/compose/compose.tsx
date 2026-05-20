import { SsvElement } from "@ssv/stencil.core";
import { Component, Event, EventEmitter, Listen, Prop, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { isComposeDevEnv } from "./is-compose-dev";
import { useCompositionRegistry } from "./registry";
import type { ComposeEventDetail } from "./types";

function toListenerProp(eventName: string): string {
	return `on${eventName.replaceAll(/(^|-)([a-z0-9])/giu, (_, __, char: string) => char.toUpperCase())}`;
}

@Component({
	tag: "ssv-compose",
	styleUrl: "compose.css",
	shadow: false,
})
export class SsvCompose extends SsvElement {
	/** Compose name string — looked up in the registry. */
	@Prop() name!: string;

	/** Data object passed to the resolved widget component. */
	@Prop() data: unknown = undefined;

	/** Normalized output event from any wrapper component in this compose's subtree. */
	@Event() composeEvent!: EventEmitter<ComposeEventDetail>;

	readonly #registry = useCompositionRegistry();

	@Listen("ssvComposeOutput")
	onComposeOutput(e: CustomEvent): void {
		e.stopPropagation();
		this.composeEvent.emit({ name: this.name, data: e.detail });
	}

	render(): VNode | null {
		if (!this.name) {
			return null;
		}
		const registry = this.#registry.current;
		const definition = registry.resolve(this.name);
		if (!definition) {
			if (isComposeDevEnv()) {
				const known = registry.listTypes();
				console.warn(
					`[compose] No definition for name "${this.name}". Known types: ${known.length > 0 ? known.join(", ") : "(none)"}`,
				);
			}
			return <slot name="error" />;
		}
		const outputListeners = definition.mapOutputs
			? Object.fromEntries(
					Object.entries(definition.mapOutputs).map(([eventName, mapper]) => [
						toListenerProp(eventName),
						(event: CustomEvent) => this.composeEvent.emit({ name: this.name, data: mapper(event) }),
					]),
				)
			: {};
		const props = {
			...(definition.mapData ? definition.mapData(this.data) : { data: this.data }),
			...outputListeners,
		};
		return h(definition.tag, props);
	}
}
