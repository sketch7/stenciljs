import { useContext } from "@ssv/stencil.core";
import type { Ref } from "@ssv/stencil.core";

import type { ComposeRegistry } from "../types";
import { ComposeRegistryContext } from "./registry";

/** Ref to the active compose registry (nearest provider or global singleton). */
export type CompositionRegistryRef = Ref<ComposeRegistry>;

/**
 * Consumes the nearest `ComposeRegistry` from context.
 *
 * @example
 * ```ts
 * readonly #registry = useCompositionRegistry();
 *
 * render() {
 *   const types = this.#registry.current.listTypes();
 * }
 * ```
 */
export function useCompositionRegistry(): CompositionRegistryRef {
	return useContext(ComposeRegistryContext);
}
