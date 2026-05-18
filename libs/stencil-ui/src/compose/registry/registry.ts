import type { CompositionDef, CompositionDefInternal, CompositionRegistry } from "../types";

export function createCompositionRegistry(): CompositionRegistry {
	const map = new Map<string, CompositionDefInternal>();

	const registry: CompositionRegistry = {
		register<TData>(name: string, definition: CompositionDef<TData>): CompositionRegistry {
			const internal = definition as unknown as CompositionDefInternal;
			map.set(name, internal);
			for (const alias of definition.aliases ?? []) {
				map.set(alias, internal);
			}
			return registry;
		},
		resolve(name: string): CompositionDefInternal | undefined {
			return map.get(name);
		},
	};

	return registry;
}

export const compositionRegistry = createCompositionRegistry();
