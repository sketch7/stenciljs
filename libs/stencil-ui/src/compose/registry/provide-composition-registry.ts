import { provideContext } from "@ssv/stencil.core";

import type { CompositionDefsMap, ComposeRegistry } from "../types";
import { ComposeRegistryContext } from "./context";
import { registerCompositionDefs } from "./register-composition-defs";
import { createComposeRegistry } from "./registry";

/**
 * Creates a scoped compose registry and provides it to descendants.
 *
 * Call as a field initializer on an `SsvElement` host (same pattern as `provideContext`).
 *
 * @example Declarative map
 * ```ts
 * readonly #registry = provideCompositionRegistry(demoCompositionDefs);
 * ```
 *
 * @example Fluent registration
 * ```ts
 * readonly #registry = provideCompositionRegistry(r =>
 *   r.register("timer", { tag: "ssv-timer-widget" }),
 * );
 * ```
 */
export function provideCompositionRegistry(
	setup: CompositionDefsMap | ((registry: ComposeRegistry) => ComposeRegistry),
): ComposeRegistry {
	const registry = createComposeRegistry();
	if (typeof setup === "function") {
		setup(registry);
	} else {
		registerCompositionDefs(setup, registry);
	}
	return provideContext(ComposeRegistryContext, registry);
}
