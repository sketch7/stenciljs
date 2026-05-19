import type { CompositionDefsMap, ComposeRegistry } from "../types";
import { composeRegistry } from "./registry";

/**
 * Registers every entry in a static defs map.
 *
 * @param defs - Primary-keyed catalog from `createCompositionDefs` or `satisfies CompositionDefsMap`.
 * @param registry - Target registry. Defaults to the global singleton.
 */
export function registerCompositionDefs(
	defs: CompositionDefsMap,
	registry: ComposeRegistry = composeRegistry,
): ComposeRegistry {
	return registry.registerFromDefs(defs);
}
