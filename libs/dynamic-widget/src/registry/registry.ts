import type { ComposeDefinition, ComposeDefinitionInternal, ComposeRegistry } from "../types";

export function createComposeRegistry(): ComposeRegistry {
	const map = new Map<string, ComposeDefinitionInternal>();

	return {
		register<TData>(type: string, definition: ComposeDefinition<TData>): void {
			const internal = definition as unknown as ComposeDefinitionInternal;
			map.set(type, internal);
			for (const alias of definition.aliases ?? []) {
				map.set(alias, internal);
			}
		},
		resolve(type: string): ComposeDefinitionInternal | undefined {
			return map.get(type);
		},
	};
}

export const composeRegistry = createComposeRegistry();
