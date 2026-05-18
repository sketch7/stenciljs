// TODO: Remove this component in favor of provideCompositionRegistry() on SsvElement hosts.
import { SsvElement, provideContext } from "@ssv/stencil.core";
import { Component, Prop, h } from "@stencil/core";

import { ComposeRegistryContext } from "../registry/context";
import { createComposeRegistry } from "../registry/registry";
import type { ComposeDefinition, ComposeDefinitionInternal, ComposeRegistry } from "../types";

@Component({
	tag: "ssv-compose-registry-provider",
	shadow: false,
})
export class SsvComposeRegistryProvider extends SsvElement {
	/**
	 * Pre-configured registry to provide to all ssv-compose descendants.
	 * Create with createComposeRegistry(), populate with defineCompose(), then pass here.
	 * When omitted a fresh isolated registry is created internally.
	 */
	@Prop() registry?: ComposeRegistry;

	readonly #ownRegistry: ComposeRegistry = createComposeRegistry();

	get #activeRegistry(): ComposeRegistry {
		return this.registry ?? this.#ownRegistry;
	}

	// Stable delegate — provideContext captures this reference once.
	// Methods read #activeRegistry at call time so @Prop() registry changes are reflected.
	readonly #delegate: ComposeRegistry = {
		register: (type: string, definition: ComposeDefinition) => this.#activeRegistry.register(type, definition),
		registerFromDefs: defs => this.#activeRegistry.registerFromDefs(defs),
		resolve: (type: string): ComposeDefinitionInternal | undefined => this.#activeRegistry.resolve(type),
		listTypes: () => this.#activeRegistry.listTypes(),
	};

	readonly registryContext = provideContext(ComposeRegistryContext, this.#delegate);

	render() {
		return <slot />;
	}
}
