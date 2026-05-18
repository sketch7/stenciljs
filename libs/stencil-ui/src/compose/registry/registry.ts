import type { ComposeDefinition, ComposeDefinitionInternal, ComposeRegistry } from "../types";

export function createComposeRegistry(): ComposeRegistry {
	const map = new Map<string, ComposeDefinitionInternal>();

	const registry: ComposeRegistry = {
		register<TData>(type: string, definition: ComposeDefinition<TData>): ComposeRegistry {
			const internal = definition as unknown as ComposeDefinitionInternal;
			map.set(type, internal);
			for (const alias of definition.aliases ?? []) {
				map.set(alias, internal);
			}
			return registry;
		},
		resolve(type: string): ComposeDefinitionInternal | undefined {
			return map.get(type);
		},
	};
	return registry;
}

export const composeRegistry = createComposeRegistry();
