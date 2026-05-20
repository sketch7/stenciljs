import { useContext, createContext, provideContext } from "@ssv/stencil.core";
import type { Ref } from "@ssv/stencil.core";

import { isComposeDevEnv } from "./is-compose-dev";
import type { ComposeDef, ComposeDefInternal, ComposeRegistry, CompositionDefsMap } from "./types";

export function createComposeRegistry(): ComposeRegistry {
	const map = new Map<string, ComposeDefInternal>();
	const primaryKeys = new Set<string>();

	const warnOverwrite = (key: string): void => {
		if (isComposeDevEnv() && map.has(key)) {
			console.warn(`[compose] Overwriting existing registry entry for "${key}"`);
		}
	};

	const registry: ComposeRegistry = {
		register<TData>(type: string, definition: ComposeDef<TData>): ComposeRegistry {
			warnOverwrite(type);
			const internal = definition as unknown as ComposeDefInternal;
			primaryKeys.add(type);
			map.set(type, internal);
			for (const alias of definition.aliases ?? []) {
				warnOverwrite(alias);
				map.set(alias, internal);
			}
			return registry;
		},
		registerFromDefs(defs: CompositionDefsMap): ComposeRegistry {
			for (const [type, definition] of Object.entries(defs)) {
				registry.register(type, definition);
			}
			return registry;
		},
		resolve(type: string): ComposeDefInternal | undefined {
			return map.get(type);
		},
		listTypes(): string[] {
			return [...primaryKeys];
		},
	};
	return registry;
}

const ComposeRegistryContext = createContext<ComposeRegistry>(undefined, {
	name: "@ssv/stencil-ui:compose-registry",
});

/** Ref to the active compose registry from the nearest `provideCompositionRegistry()` ancestor. */
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

export function provideCompositionRegistry(
	setup: CompositionDefsMap | ((registry: ComposeRegistry) => ComposeRegistry),
): ComposeRegistry {
	const registry = createComposeRegistry();
	if (typeof setup === "function") {
		setup(registry);
	} else {
		registry.registerFromDefs(setup);
	}

	return provideContext(ComposeRegistryContext, registry);
}
