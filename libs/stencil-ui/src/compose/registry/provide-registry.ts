import { provideContext, useContext } from "@ssv/stencil.core";
import type { ContextRef } from "@ssv/stencil.core";

import type {
	CompositionDefsList,
	CompositionDefsMap,
	CompositionRegistry,
	CompositionRegistrySetup,
	ProvideCompositionRegistryOptions,
} from "../types";
import { CompositionRegistryContext } from "./context";
import { createCompositionRegistry } from "./registry";

function isCompositionRegistry(x: unknown): x is CompositionRegistry {
	return (
		typeof x === "object" &&
		x !== null &&
		"register" in x &&
		"resolve" in x &&
		typeof (x as CompositionRegistry).register === "function" &&
		!("definitions" in x)
	);
}

function applyDefinitions(registry: CompositionRegistry, definitions: CompositionDefsMap | CompositionDefsList): void {
	if (Array.isArray(definitions)) {
		for (const [name, def] of definitions) {
			registry.register(name, def);
		}
	} else {
		for (const [name, def] of Object.entries(definitions)) {
			registry.register(name, def);
		}
	}
}

/**
 * Provides a `CompositionRegistry` to all descendant `ssv-compose` components.
 *
 * Call in a class field initializer on an `SsvElement` host. Returns the registry.
 */
export function provideCompositionRegistry(
	registryOrSetupOrOptions?: CompositionRegistry | CompositionRegistrySetup | ProvideCompositionRegistryOptions,
): CompositionRegistry {
	let active: CompositionRegistry;

	if (registryOrSetupOrOptions === undefined) {
		active = createCompositionRegistry();
	} else if (typeof registryOrSetupOrOptions === "function") {
		active = createCompositionRegistry();
		const result = registryOrSetupOrOptions(active);
		if (result !== undefined) {
			active = result;
		}
	} else if (isCompositionRegistry(registryOrSetupOrOptions)) {
		active = registryOrSetupOrOptions;
	} else {
		const opts = registryOrSetupOrOptions;
		active = opts.registry ?? createCompositionRegistry();
		if (opts.definitions) {
			applyDefinitions(active, opts.definitions);
		}
		if (opts.setup) {
			const result = opts.setup(active);
			if (result !== undefined) {
				active = result;
			}
		}
	}

	provideContext(CompositionRegistryContext, active);
	return active;
}

/**
 * Resolves the nearest `CompositionRegistry` from the component tree, or returns the explicit registry if provided.
 */
export function useCompositionRegistry(registry?: CompositionRegistry): ContextRef<CompositionRegistry> {
	if (registry) {
		return { current: registry };
	}
	return useContext(CompositionRegistryContext);
}
