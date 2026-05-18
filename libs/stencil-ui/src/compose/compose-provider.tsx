import { SsvElement, provideContext } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import { CompositionRegistryContext } from "./registry/context";
import { createCompositionRegistry } from "./registry/registry";
import type { CompositionDefinition, CompositionDefinitionInternal, CompositionRegistry } from "./types";

@Component({
	tag: "ssv-compose-provider",
	shadow: false,
})
export class SsvComposeProvider extends SsvElement {
	/**
	 * Pre-configured registry for all ssv-compose descendants.
	 * Create with createCompositionRegistry(), chain `.register()`, then pass here.
	 * When omitted a fresh isolated registry is created internally.
	 */
	@Prop() registry?: CompositionRegistry;

	readonly #ownRegistry: CompositionRegistry = createCompositionRegistry();

	get #activeRegistry(): CompositionRegistry {
		return this.registry ?? this.#ownRegistry;
	}

	readonly #delegate: CompositionRegistry = {
		register: (name: string, definition: CompositionDefinition) =>
			this.#activeRegistry.register(name, definition),
		resolve: (name: string): CompositionDefinitionInternal | undefined => this.#activeRegistry.resolve(name),
	};

	constructor() {
		super();
		provideContext(CompositionRegistryContext, this.#delegate);
	}

	render() {
		return <slot />;
	}
}
