import type { CompositionDefinition, CompositionDefinitionInternal, CompositionRegistry } from "../types";

export function createCompositionRegistry(): CompositionRegistry {
	const map = new Map<string, CompositionDefinitionInternal>();

	const registry: CompositionRegistry = {
		register<TData>(name: string, definition: CompositionDefinition<TData>): CompositionRegistry {
			const internal = definition as unknown as CompositionDefinitionInternal;
			map.set(name, internal);
			for (const alias of definition.aliases ?? []) {
				map.set(alias, internal);
			}
			return registry;
		},
		resolve(name: string): CompositionDefinitionInternal | undefined {
			return map.get(name);
		},
	};

	return registry;
}

export const compositionRegistry = createCompositionRegistry();
