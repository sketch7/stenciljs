import { SsvElement, provideContext } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import { WidgetRegistryContext } from "../../registry/context";
import { createWidgetRegistry } from "../../registry/registry";
import type { WidgetDefinition, WidgetDefinitionInternal, WidgetRegistry } from "../../types";

@Component({
	tag: "ssv-widget-registry-provider",
	shadow: false,
})
export class SsvWidgetRegistryProvider extends SsvElement {
	/**
	 * Pre-configured registry to provide to all ssv-dynamic-widget descendants.
	 * Create with createWidgetRegistry(), populate with defineWidget(), then pass here.
	 * When omitted a fresh isolated registry is created internally.
	 */
	@Prop() registry?: WidgetRegistry;

	readonly #ownRegistry: WidgetRegistry = createWidgetRegistry();

	get #activeRegistry(): WidgetRegistry {
		return this.registry ?? this.#ownRegistry;
	}

	// Stable delegate — provideContext captures this reference once.
	// Methods read #activeRegistry at call time so @Prop() registry changes are reflected.
	readonly #delegate: WidgetRegistry = {
		register: (type: string, definition: WidgetDefinition) => this.#activeRegistry.register(type, definition),
		resolve: (type: string): WidgetDefinitionInternal | undefined => this.#activeRegistry.resolve(type),
	};

	constructor() {
		super();
		// Called after field initializers; currentHost is still set by SsvElement mixin.
		provideContext(WidgetRegistryContext, this.#delegate);
	}

	render() {
		return <slot />;
	}
}
